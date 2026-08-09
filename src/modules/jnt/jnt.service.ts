import { AppError } from '../../shared/errors/app-error';
import { TrackingCarrier } from '../tracking/tracking-carrier';
import type { NormalizedTrackingRecord } from '../tracking/tracking-record';
import { JntClient, jntClient } from './jnt.client';
import { parseJntTrackingHtml } from './jnt.parser';

const maskPhoneLast4 = (value: string): string => (value ? '****' : '');

export class JntService {
  constructor(private readonly client: JntClient = jntClient) {}

  async getLatestTrackingRecord(
    trackingNumber: string,
    phoneLast4?: string | null,
  ): Promise<NormalizedTrackingRecord> {
    const records = await this.getTrackingRecords(trackingNumber, phoneLast4);
    const latestRecord = records[0];

    if (!latestRecord) {
      throw new AppError('J&T did not return tracking history for this order', 404);
    }

    return latestRecord;
  }

  async getTrackingRecords(
    trackingNumber: string,
    phoneLast4?: string | null,
  ): Promise<NormalizedTrackingRecord[]> {
    if (!phoneLast4 || !/^\d{4}$/.test(phoneLast4)) {
      throw new AppError('J&T tracking requires phone last 4 digits', 400);
    }

    const html = await this.client.getTrackingHtml(trackingNumber, phoneLast4);
    const parsed = parseJntTrackingHtml(html, trackingNumber);

    if (parsed.events.length === 0) {
      throw new AppError('J&T did not return tracking history for this order', 404);
    }

    return parsed.events.map((event) => ({
      carrier: TrackingCarrier.JNT,
      trackingNumber: parsed.trackingNumber,
      trackingCode: event.trackingCode,
      trackingName: event.trackingName,
      status: event.status,
      location: event.location,
      nextLocation: event.nextLocation,
      milestoneCode: event.milestoneCode,
      milestoneName: event.milestoneName,
      eventTime: event.eventTime,
      rawData: {
        source: 'jtexpress.vn',
        billcode: parsed.trackingNumber,
        cellphone: maskPhoneLast4(phoneLast4),
        event: event.rawData,
      },
    }));
  }
}

export const jntService = new JntService();
