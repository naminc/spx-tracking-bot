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
    if (!phoneLast4 || !/^\d{4}$/.test(phoneLast4)) {
      throw new AppError('J&T tracking requires phone last 4 digits', 400);
    }

    const html = await this.client.getTrackingHtml(trackingNumber, phoneLast4);
    const parsed = parseJntTrackingHtml(html, trackingNumber);
    const latestEvent = parsed.events[0];

    if (!latestEvent) {
      throw new AppError('J&T did not return tracking history for this order', 404);
    }

    return {
      carrier: TrackingCarrier.JNT,
      trackingNumber: parsed.trackingNumber,
      trackingCode: latestEvent.trackingCode,
      trackingName: latestEvent.trackingName,
      status: latestEvent.status,
      location: latestEvent.location,
      nextLocation: latestEvent.nextLocation,
      milestoneCode: latestEvent.milestoneCode,
      milestoneName: latestEvent.milestoneName,
      eventTime: latestEvent.eventTime,
      rawData: {
        source: 'jtexpress.vn',
        billcode: parsed.trackingNumber,
        cellphone: maskPhoneLast4(phoneLast4),
        latest_event: latestEvent.rawData,
      },
    };
  }
}

export const jntService = new JntService();
