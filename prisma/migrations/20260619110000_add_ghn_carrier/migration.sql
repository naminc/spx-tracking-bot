-- Add carrier support while preserving existing SPX data.
ALTER TABLE `TrackingOrder`
  ADD COLUMN `carrier` ENUM('SPX', 'GHN') NOT NULL DEFAULT 'SPX';

ALTER TABLE `TrackingHistory`
  ADD COLUMN `carrier` ENUM('SPX', 'GHN') NOT NULL DEFAULT 'SPX';

ALTER TABLE `TrackingOrderActionLog`
  ADD COLUMN `carrier` ENUM('SPX', 'GHN') NOT NULL DEFAULT 'SPX';

DROP INDEX `TrackingOrder_trackingNumber_telegramChatId_key` ON `TrackingOrder`;

CREATE UNIQUE INDEX `TrackingOrder_carrier_trackingNumber_telegramChatId_key`
  ON `TrackingOrder`(`carrier`, `trackingNumber`, `telegramChatId`);

CREATE INDEX `TrackingOrder_carrier_idx` ON `TrackingOrder`(`carrier`);
CREATE INDEX `TrackingHistory_carrier_idx` ON `TrackingHistory`(`carrier`);
CREATE INDEX `TrackingOrderActionLog_carrier_idx` ON `TrackingOrderActionLog`(`carrier`);
