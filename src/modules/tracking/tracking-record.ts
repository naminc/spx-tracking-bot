import type { TrackingCarrier } from './tracking-carrier';

export type NormalizedTrackingRecord = {
  carrier: TrackingCarrier;
  trackingNumber: string;
  trackingCode: string;
  trackingName?: string;
  status: string;
  location?: string;
  nextLocation?: string;
  description?: string;
  buyerDescription?: string;
  sellerDescription?: string;
  milestoneCode?: string;
  milestoneName?: string;
  eventTime: Date;
  rawData: Record<string, unknown>;
};
