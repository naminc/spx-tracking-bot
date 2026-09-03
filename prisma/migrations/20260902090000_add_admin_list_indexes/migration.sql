CREATE INDEX `TrackingOrder_telegramChatId_idx` ON `TrackingOrder`(`telegramChatId`);
CREATE INDEX `TrackingOrder_finalStatus_idx` ON `TrackingOrder`(`finalStatus`);
CREATE INDEX `TrackingOrder_lastEventTime_idx` ON `TrackingOrder`(`lastEventTime`);
CREATE INDEX `TrackingOrder_createdAt_idx` ON `TrackingOrder`(`createdAt`);
CREATE INDEX `TrackingOrder_updatedAt_idx` ON `TrackingOrder`(`updatedAt`);
CREATE INDEX `User_createdAt_idx` ON `User`(`createdAt`);
