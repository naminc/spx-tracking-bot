import type { User } from "./user";

export type TrackingOrderActionType = "ADD" | "REMOVE";
export type TrackingOrderActionSource = "TELEGRAM" | "ADMIN";

export type TrackingActionLogOrder = {
  id: number;
  trackingNumber: string;
  telegramChatId: string;
  userId: number | null;
};

export type TrackingOrderActionLog = {
  id: number;
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
  action?: TrackingOrderActionType | "";
  source?: TrackingOrderActionSource | "";
  trackingNumber?: string;
  telegramChatId?: string;
  userId?: string;
  limit?: number;
};
