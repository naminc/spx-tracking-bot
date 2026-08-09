import axios, { AxiosError } from 'axios';
import { trackingProviderConfig } from '../../config/tracking-providers';
import { AppError } from '../../shared/errors/app-error';
import { logger } from '../../shared/logger/logger';
import { TrackingCarrier } from '../tracking/tracking-carrier';
import type { NormalizedTrackingRecord } from '../tracking/tracking-record';

type GhnLocation = {
  address?: unknown;
  [key: string]: unknown;
};

type GhnTrackingLog = {
  order_code?: unknown;
  action_code?: unknown;
  status?: unknown;
  status_name?: unknown;
  location?: GhnLocation | null;
  action_at?: unknown;
  sync_data_at?: unknown;
  [key: string]: unknown;
};

type GhnOrderInfo = {
  order_code?: unknown;
  status?: unknown;
  action?: unknown;
  status_name?: unknown;
  picktime?: unknown;
  leadtime?: unknown;
  [key: string]: unknown;
};

type GhnApiResponse = {
  code?: number;
  message?: string;
  data?: {
    order_info?: GhnOrderInfo | null;
    tracking_logs?: GhnTrackingLog[] | null;
  };
};

type ParsedGhnLocation = {
  location?: string;
  nextLocation?: string;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  return String(value);
};

const toRequiredString = (value: unknown): string | undefined => {
  const stringValue = toOptionalString(value)?.trim();
  return stringValue ? stringValue : undefined;
};

const toDate = (value: unknown): Date | undefined => {
  const stringValue = toRequiredString(value);

  if (!stringValue) {
    return undefined;
  }

  const date = new Date(stringValue);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const isArrivalAction = (actionCode?: string): boolean => {
  const normalizedActionCode = normalizeText(actionCode ?? '').toUpperCase();
  return normalizedActionCode.includes('ARRIVE') || normalizedActionCode.includes('ARRIVED');
};

const cleanLocationText = (value: string | undefined): string | undefined => {
  const cleanedValue = value?.trim().replace(/\s+/g, ' ');
  return cleanedValue || undefined;
};

const matchAddress = (address: string, pattern: RegExp): RegExpMatchArray | null =>
  address.match(pattern);

const isNarrativeAddress = (address: string): boolean => {
  const normalizedAddress = normalizeText(address);
  return (
    normalizedAddress.startsWith('don hang') ||
    normalizedAddress.startsWith('nhan vien') ||
    normalizedAddress.includes('khong thanh cong')
  );
};

export class GhnService {
  async getLatestTrackingRecord(trackingNumber: string): Promise<NormalizedTrackingRecord> {
    const records = await this.getTrackingRecords(trackingNumber);
    const latestRecord = records[0];

    if (!latestRecord) {
      throw new AppError('GHN did not return tracking logs for this order', 404);
    }

    return latestRecord;
  }

  async getTrackingRecords(trackingNumber: string): Promise<NormalizedTrackingRecord[]> {
    const response = await this.getTrackingResponse(trackingNumber);
    const orderInfo = response.data?.order_info ?? null;
    const logs = response.data?.tracking_logs ?? [];
    const sortedLogs = [...logs]
      .filter((log) => toDate(log.action_at))
      .sort((first, second) => {
        const firstTime = toDate(first.action_at)?.getTime() ?? 0;
        const secondTime = toDate(second.action_at)?.getTime() ?? 0;
        return secondTime - firstTime;
      });
    const latestLog = sortedLogs[0];

    if (!latestLog) {
      throw new AppError('GHN did not return tracking logs for this order', 404);
    }

    return sortedLogs.map((log) => this.normalizeRecord(trackingNumber, log, orderInfo, sortedLogs));
  }

  private async getTrackingResponse(trackingNumber: string): Promise<GhnApiResponse> {
    try {
      const response = await axios.post<GhnApiResponse>(
        trackingProviderConfig.ghn.trackingLogsUrl,
        { order_code: trackingNumber },
        {
          headers: trackingProviderConfig.ghn.headers,
          timeout: trackingProviderConfig.ghn.requestTimeoutMs,
        },
      );

      if (response.data.code !== 200) {
        throw new AppError(
          response.data.message || 'GHN did not return a successful response',
          502,
          response.data,
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const statusCode = error instanceof AxiosError ? error.response?.status : undefined;
      logger.warn({ err: error, statusCode, trackingNumber }, 'GHN request failed');
      throw new AppError('Could not fetch order information from GHN', 502, error);
    }
  }

  private normalizeRecord(
    trackingNumber: string,
    log: GhnTrackingLog,
    orderInfo: GhnOrderInfo | null,
    sortedLogs: GhnTrackingLog[],
  ): NormalizedTrackingRecord {
    const trackingCode =
      toRequiredString(log.action_code) ||
      toRequiredString(orderInfo?.action) ||
      toRequiredString(log.status) ||
      toRequiredString(orderInfo?.status);
    const status =
      toRequiredString(log.status_name) ||
      toRequiredString(orderInfo?.status_name) ||
      toRequiredString(log.status) ||
      toRequiredString(orderInfo?.status);
    const eventTime = toDate(log.action_at);

    if (!trackingCode || !status || !eventTime) {
      throw new AppError('GHN returned an invalid tracking record', 502, {
        order_info: orderInfo,
        tracking_log: log,
      });
    }

    const parsedLocation = this.resolveLocations(log, sortedLogs);

    return {
      carrier: TrackingCarrier.GHN,
      trackingNumber,
      trackingCode,
      trackingName: toOptionalString(log.status),
      status,
      location: parsedLocation.location,
      nextLocation: parsedLocation.nextLocation,
      milestoneCode: toOptionalString(log.status),
      milestoneName: toOptionalString(orderInfo?.status_name),
      eventTime,
      rawData: {
        order_info: orderInfo,
        tracking_log: log,
        location_mapping: parsedLocation,
      },
    };
  }

  private resolveLocations(log: GhnTrackingLog, sortedLogs: GhnTrackingLog[]): ParsedGhnLocation {
    const parsedLocation = this.parseLocationAddress(
      toRequiredString(log.location?.address),
      toRequiredString(log.action_code),
    );

    if (parsedLocation.location || !parsedLocation.nextLocation) {
      return parsedLocation;
    }

    const previousLocation = sortedLogs
      .filter((candidateLog) => candidateLog !== log)
      .map((candidateLog) =>
        this.parseLocationAddress(
          toRequiredString(candidateLog.location?.address),
          toRequiredString(candidateLog.action_code),
        ),
      )
      .find((candidateLocation) => candidateLocation.location)?.location;

    if (
      previousLocation &&
      normalizeText(previousLocation) !== normalizeText(parsedLocation.nextLocation)
    ) {
      return {
        location: previousLocation,
        nextLocation: parsedLocation.nextLocation,
      };
    }

    return parsedLocation;
  }

  private parseLocationAddress(address: string | undefined, actionCode?: string): ParsedGhnLocation {
    if (!address) {
      return {};
    }

    const exportedMatch = matchAddress(address, /^Đơn hàng đã xuất khỏi\s+(.+?)\s+đến\s+(.+)$/iu);
    if (exportedMatch) {
      return {
        location: cleanLocationText(exportedMatch[1]),
        nextLocation: cleanLocationText(exportedMatch[2]),
      };
    }

    const inTransitMatch = matchAddress(address, /^Đơn hàng đang trung chuyển đến\s+(.+)$/iu);
    if (inTransitMatch) {
      const destination = cleanLocationText(inTransitMatch[1]);
      return isArrivalAction(actionCode)
        ? { location: destination }
        : { nextLocation: destination };
    }

    const waitingToExportMatch = matchAddress(address, /^Đơn hàng chờ xuất đến\s+(.+)$/iu);
    if (waitingToExportMatch) {
      return { nextLocation: cleanLocationText(waitingToExportMatch[1]) };
    }

    const storingMatch = matchAddress(address, /^Đơn hàng lưu tại\s+(.+)$/iu);
    if (storingMatch) {
      return { location: cleanLocationText(storingMatch[1]) };
    }

    const pickedMatch = matchAddress(address, /^Đơn hàng lấy thành công tại\s+(.+)$/iu);
    if (pickedMatch) {
      return { location: cleanLocationText(pickedMatch[1]) };
    }

    const pickingMatch = matchAddress(address, /^Nhân viên đang lấy hàng tại địa chỉ\s+(.+)$/iu);
    if (pickingMatch) {
      return { location: cleanLocationText(pickingMatch[1]) };
    }

    const destinationMatch = matchAddress(address, /\s+đến\s+(.+)$/iu);
    if (destinationMatch) {
      return { nextLocation: cleanLocationText(destinationMatch[1]) };
    }

    const locationMatch = matchAddress(address, /\s+tại\s+(.+)$/iu);
    if (locationMatch) {
      return { location: cleanLocationText(locationMatch[1]) };
    }

    return isNarrativeAddress(address) ? {} : { location: cleanLocationText(address) };
  }
}

export const ghnService = new GhnService();
