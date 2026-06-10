import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { logger } from '../../shared/logger/logger';

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

export type NormalizedSpxRecord = {
  trackingCode: string;
  trackingName?: string;
  status: string;
  description?: string;
  buyerDescription?: string;
  sellerDescription?: string;
  milestoneCode?: string;
  milestoneName?: string;
  eventTime: Date;
  rawData: SpxRecord;
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

    return this.normalizeRecord(latestRecord);
  }

  private async getTrackingRecords(trackingNumber: string): Promise<SpxRecord[]> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await axios.get<SpxApiResponse>(env.SPX_API_URL, {
          params: {
            spx_tn: trackingNumber,
            language_code: env.SPX_LANGUAGE_CODE,
          },
          headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'vi,en-US;q=0.9,en;q=0.8',
            referer: `https://spx.vn/track?${trackingNumber}`,
            'user-agent': 'Mozilla/5.0',
          },
          timeout: 15_000,
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

  private normalizeRecord(record: SpxRecord): NormalizedSpxRecord {
    const status = toRequiredString(record.buyer_description) || toRequiredString(record.description);
    const trackingCode = toRequiredString(record.tracking_code);
    const actualTime = toTimestampSeconds(record.actual_time);

    if (!status || !trackingCode || !actualTime) {
      throw new AppError('SPX returned an invalid tracking record', 502, record);
    }

    return {
      trackingCode,
      trackingName: toOptionalString(record.tracking_name),
      status,
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
