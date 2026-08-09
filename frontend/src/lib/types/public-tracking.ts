import type { FinalStatus, TrackingCarrier } from "./tracking";

export type PublicTrackingCarrierInput = TrackingCarrier | "AUTO";

export type PublicTrackingEvent = {
  trackingCode: string;
  trackingName?: string | null;
  status: string;
  location?: string | null;
  nextLocation?: string | null;
  description?: string | null;
  buyerDescription?: string | null;
  sellerDescription?: string | null;
  milestoneCode?: string | null;
  milestoneName?: string | null;
  eventTime: string;
};

export type PublicTrackingResult = {
  carrier: TrackingCarrier;
  trackingNumber: string;
  latest: PublicTrackingEvent;
  finalStatus: FinalStatus;
  events: PublicTrackingEvent[];
};

export type PublicTrackInput = {
  carrier?: PublicTrackingCarrierInput;
  trackingNumber: string;
  trackingCredential?: string;
};
