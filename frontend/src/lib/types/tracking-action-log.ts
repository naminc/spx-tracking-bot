import type { User } from "./user";
import type { TrackingCarrier } from "./tracking";

export type TrackingOrderActionType = "ADD" | "REMOVE";
export type TrackingOrderActionSource = "TELEGRAM" | "ADMIN";

export type TrackingActionLogOrder = {
  id: number;
  carrier: TrackingCarrier;
  trackingNumber: string;
  telegramChatId: string;
  userId: number | null;
};

export type TrackingOrderActionLog = {
  id: number;
  carrier: TrackingCarrier;
  action: TrackingOrderActionType;
  source: TrackingOrderActionSource;
  trackingNumber: string;
  telegramChatId: string | null;
  userId: number | null;
  user: User | null;
  orderId: number | null;
  order: TrackingActionLogOrder | null;
  adminTelegramId: string | null;
  adminUsername: string | null;
  metadata: unknown;
  createdAt: string;
};

export type TrackingOrderActionLogFilters = {
  carrier?: TrackingCarrier | "";
  action?: TrackingOrderActionType | "";
  source?: TrackingOrderActionSource | "";
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: string;
  page?: number;
  limit?: number;
  sort?: "CREATED_DESC" | "CREATED_ASC";
};
