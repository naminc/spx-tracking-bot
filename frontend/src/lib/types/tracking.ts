export type FinalStatus = "PENDING" | "DELIVERED" | "FAILED" | "CANCELLED";
export type TrackingCarrier = "SPX" | "GHN" | "JNT";

export type TrackingUser = {
  id: number;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isBlocked?: boolean;
};

export type TrackingOrder = {
  id: number;
  carrier: TrackingCarrier;
  trackingNumber: string;
  telegramChatId: string;
  userId: number | null;
  user: TrackingUser | null;
  note: string | null;
  trackingCredential: string | null;
  currentStatus: string;
  currentStatusCode: string;
  currentLocation: string | null;
  nextLocation: string | null;
  milestoneCode: string | null;
  milestoneName: string | null;
  lastEventTime: string;
  isCompleted: boolean;
  finalStatus: FinalStatus;
  createdAt: string;
  updatedAt: string;
};

export type TrackingHistory = {
  id: number;
  orderId: number;
  carrier: TrackingCarrier;
  trackingCode: string;
  trackingName: string | null;
  status: string;
  location: string | null;
  nextLocation: string | null;
  description: string | null;
  buyerDescription: string | null;
  sellerDescription: string | null;
  milestoneCode: string | null;
  milestoneName: string | null;
  eventTime: string;
  rawData: unknown;
  createdAt: string;
  order?: {
    carrier: TrackingCarrier;
    trackingNumber: string;
    telegramChatId: string;
    userId: number | null;
    note: string | null;
    user: TrackingUser | null;
  };
};
