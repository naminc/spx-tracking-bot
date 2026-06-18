import type { User } from "./user";

export type BroadcastStatus = "DRAFT" | "SENDING" | "SENT" | "FAILED";
export type BroadcastRecipientStatus = "PENDING" | "SENT" | "FAILED";
export type BroadcastTargetType = "ALL_USERS" | "SELECTED_USERS";

export type BroadcastRecipient = {
  id: number;
  broadcastId: number;
  userId: number | null;
  user: User | null;
  telegramUserId: string;
  status: BroadcastRecipientStatus;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type Broadcast = {
  id: number;
  title: string | null;
  message: string;
  status: BroadcastStatus;
  targetType: BroadcastTargetType;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};

export type BroadcastDetail = Broadcast & {
  recipients: BroadcastRecipient[];
};

export type CreateBroadcastInput = {
  title?: string;
  message: string;
  targetType: BroadcastTargetType;
  userIds?: number[];
};
