import axios, { AxiosError } from 'axios';
import { trackingProviderConfig } from '../../config/tracking-providers';
import { AppError } from '../../shared/errors/app-error';
import { logger } from '../../shared/logger/logger';
import { TrackingCarrier } from '../tracking/tracking-carrier';
import type { NormalizedTrackingRecord } from '../tracking/tracking-record';

export type SpxRecord = {
  tracking_code?: unknown;
  tracking_name?: unknown;
  description?: unknown;
  buyer_description?: unknown;
  seller_description?: unknown;
  milestone_code?: unknown;
  milestone_name?: unknown;
  actual_time?: unknown;
  [key: string]: unknown;
};

type SpxApiResponse = {
  data?: {
    sls_tracking_info?: {
      records?: SpxRecord[];
    };
  };
};

export type NormalizedSpxRecord = NormalizedTrackingRecord;

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

const getObjectStringValue = (
  value: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const stringValue = toLocationString(value[key]);

    if (stringValue) {
      return stringValue;
    }
  }

  return undefined;
};

const toLocationString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return toRequiredString(value);
  }

  if (Array.isArray(value)) {
    const values = value.map((item) => toLocationString(item)).filter(Boolean);
    return values.length > 0 ? values.join(', ') : undefined;
  }

  if (typeof value === 'object') {
    return getObjectStringValue(value as Record<string, unknown>, [
      'name',
      'location_name',
      'locationName',
      'station_name',
      'stationName',
      'hub_name',
      'hubName',
      'warehouse_name',
      'warehouseName',
      'address',
      'full_address',
      'fullAddress',
      'display_name',
      'displayName',
      'description',
      'value',
    ]);
  }

  return undefined;
};

const toTimestampSeconds = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class SpxService {
  async getLatestTrackingRecord(trackingNumber: string): Promise<NormalizedSpxRecord> {
    const records = await this.getTrackingRecords(trackingNumber);
    const latestRecord = records[0];

    if (!latestRecord) {
      throw new AppError('SPX did not return tracking records for this order', 404);
    }

    return this.normalizeRecord(trackingNumber, latestRecord);
  }

  private async getTrackingRecords(trackingNumber: string): Promise<SpxRecord[]> {
    const maxAttempts = trackingProviderConfig.spx.maxAttempts;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await axios.get<SpxApiResponse>(trackingProviderConfig.spx.apiUrl, {
          params: {
            spx_tn: trackingNumber,
            language_code: trackingProviderConfig.spx.languageCode,
          },
          headers: trackingProviderConfig.spx.buildHeaders(trackingNumber),
          timeout: trackingProviderConfig.spx.requestTimeoutMs,
        });

        return response.data.data?.sls_tracking_info?.records ?? [];
      } catch (error) {
        lastError = error;
        const statusCode = error instanceof AxiosError ? error.response?.status : undefined;
        logger.warn({ err: error, statusCode, attempt, trackingNumber }, 'SPX request failed');

        if (attempt < maxAttempts) {
          await sleep(attempt * 750);
        }
      }
    }

    throw new AppError('Could not fetch order information from SPX', 502, lastError);
  }

  private normalizeRecord(trackingNumber: string, record: SpxRecord): NormalizedSpxRecord {
    const status = toRequiredString(record.buyer_description) || toRequiredString(record.description);
    const trackingCode = toRequiredString(record.tracking_code);
    const actualTime = toTimestampSeconds(record.actual_time);

    if (!status || !trackingCode || !actualTime) {
      throw new AppError('SPX returned an invalid tracking record', 502, record);
    }

    return {
      carrier: TrackingCarrier.SPX,
      trackingNumber,
      trackingCode,
      trackingName: toOptionalString(record.tracking_name),
      status,
      location: toLocationString(record.location),
      nextLocation: toLocationString(record.next_location),
      description: toOptionalString(record.description),
      buyerDescription: toOptionalString(record.buyer_description),
      sellerDescription: toOptionalString(record.seller_description),
      milestoneCode: toOptionalString(record.milestone_code),
      milestoneName: toOptionalString(record.milestone_name),
      eventTime: new Date(actualTime * 1000),
      rawData: record,
    };
  }
}

export const spxService = new SpxService();
