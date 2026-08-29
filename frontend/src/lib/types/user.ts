export type User = {
  id: number;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  blockedByAdminTelegramId: string | null;
  blockedByAdminUsername: string | null;
  createdAt: string;
  ordersCount: number;
};
