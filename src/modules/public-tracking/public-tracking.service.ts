import { AppError } from '../../shared/errors/app-error';
import { GhnService, ghnService } from '../ghn/ghn.service';
import { JntService, jntService } from '../jnt/jnt.service';
import { SpxService, spxService } from '../spx/spx.service';
import type { FinalStatus } from '../tracking/final-status';
import {
  TrackingOrderActionSource,
  TrackingOrderActionType,
  trackingOrderActionLogService,
  type TrackingOrderActionLogService,
} from '../tracking-action-log/tracking-action-log.service';
import {
  TrackingCarrier,
  detectTrackingCarrier,
  isValidTrackingNumberForCarrier,
} from '../tracking/tracking-carrier';
import type { NormalizedTrackingRecord } from '../tracking/tracking-record';
import { TrackingService, trackingService } from '../tracking/tracking.service';
import type { PublicTrackInput } from './public-tracking.schema';

type PublicTrackingEvent = Omit<NormalizedTrackingRecord, 'carrier' | 'trackingNumber' | 'rawData'>;

export type PublicTrackingResult = {
  carrier: TrackingCarrier;
  trackingNumber: string;
  latest: PublicTrackingEvent;
  finalStatus: FinalStatus;
  events: PublicTrackingEvent[];
};

const toPublicEvent = (record: NormalizedTrackingRecord): PublicTrackingEvent => ({
  trackingCode: record.trackingCode,
  trackingName: record.trackingName,
  status: record.status,
  location: record.location,
  nextLocation: record.nextLocation,
  description: record.description,
  buyerDescription: record.buyerDescription,
  sellerDescription: record.sellerDescription,
  milestoneCode: record.milestoneCode,
  milestoneName: record.milestoneName,
  eventTime: record.eventTime,
});

export class PublicTrackingService {
  constructor(
    private readonly spx: SpxService = spxService,
    private readonly ghn: GhnService = ghnService,
    private readonly jnt: JntService = jntService,
    private readonly tracking: TrackingService = trackingService,
    private readonly actionLogs: TrackingOrderActionLogService = trackingOrderActionLogService,
  ) {}

  async track(input: PublicTrackInput): Promise<PublicTrackingResult> {
    const carrier = this.resolveCarrier(input.trackingNumber, input.carrier);

    if (carrier === TrackingCarrier.JNT && !input.trackingCredential) {
      throw new AppError('J&T cần 4 số cuối SĐT để tra cứu', 400);
    }

    if (carrier === TrackingCarrier.GHN && !input.trackingCredential) {
      throw new AppError('GHN cần SĐT người nhận hoặc phone_verify để tra cứu', 400);
    }

    const records = await this.safeGetTrackingRecords(
      carrier,
      input.trackingNumber,
      input.trackingCredential,
    );
    const latestRecord = records[0];

    if (!latestRecord) {
      throw new AppError('Không tìm thấy lịch sử tracking cho vận đơn này', 404);
    }

    const finalStatus = this.tracking.detectFinalStatus(
      latestRecord.status,
      latestRecord.trackingCode,
      carrier,
    );

    await this.actionLogs.safeCreateLog({
      carrier,
      action: TrackingOrderActionType.PUBLIC_TRACK,
      source: TrackingOrderActionSource.PUBLIC_WEB,
      trackingNumber: input.trackingNumber,
      telegramChatId: null,
      userId: null,
      orderId: null,
      adminTelegramId: null,
      adminUsername: 'Guest',
      metadata: {
        via: 'public_track_page',
        success: true,
        finalStatus,
        eventsCount: records.length,
        hasCredential: Boolean(input.trackingCredential),
        credentialType: this.getCredentialType(carrier, input.trackingCredential),
      },
    });

    return {
      carrier,
      trackingNumber: input.trackingNumber,
      latest: toPublicEvent(latestRecord),
      finalStatus,
      events: records.map(toPublicEvent),
    };
  }

  private getCredentialType(
    carrier: TrackingCarrier,
    trackingCredential?: string,
  ): 'phone_last_4' | 'phone_or_phone_verify' | null {
    if (!trackingCredential) {
      return null;
    }

    if (carrier === TrackingCarrier.JNT) {
      return 'phone_last_4';
    }

    if (carrier === TrackingCarrier.GHN) {
      return 'phone_or_phone_verify';
    }

    return null;
  }

  private async safeGetTrackingRecords(
    carrier: TrackingCarrier,
    trackingNumber: string,
    trackingCredential?: string,
  ): Promise<NormalizedTrackingRecord[]> {
    try {
      return await this.getTrackingRecords(carrier, trackingNumber, trackingCredential);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        throw new AppError('Không tìm thấy lịch sử tracking cho vận đơn này', 404);
      }

      if (error instanceof AppError && error.statusCode === 400) {
        throw new AppError(error.message, 400);
      }

      throw new AppError('Không thể tra cứu vận đơn', 502);
    }
  }

  private getTrackingRecords(
    carrier: TrackingCarrier,
    trackingNumber: string,
    trackingCredential?: string,
  ): Promise<NormalizedTrackingRecord[]> {
    if (carrier === TrackingCarrier.GHN) {
      return this.ghn.getTrackingRecords(trackingNumber, trackingCredential);
    }

    if (carrier === TrackingCarrier.JNT) {
      return this.jnt.getTrackingRecords(trackingNumber, trackingCredential);
    }

    return this.spx.getTrackingRecords(trackingNumber);
  }

  private resolveCarrier(
    trackingNumber: string,
    carrierHint: TrackingCarrier | 'AUTO',
  ): TrackingCarrier {
    const carrier = detectTrackingCarrier(trackingNumber, carrierHint);

    if (!carrier || !isValidTrackingNumberForCarrier(trackingNumber, carrier)) {
      throw new AppError('Mã vận đơn không hợp lệ hoặc chưa được hỗ trợ', 400);
    }

    return carrier;
  }
}

export const publicTrackingService = new PublicTrackingService();
