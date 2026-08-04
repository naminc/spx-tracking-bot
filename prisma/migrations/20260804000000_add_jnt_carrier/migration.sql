ALTER TABLE `TrackingOrder`
  MODIFY COLUMN `carrier` ENUM('SPX', 'GHN', 'JNT') NOT NULL DEFAULT 'SPX',
  ADD COLUMN `trackingCredential` VARCHAR(32) NULL;

ALTER TABLE `TrackingHistory`
  MODIFY COLUMN `carrier` ENUM('SPX', 'GHN', 'JNT') NOT NULL DEFAULT 'SPX';

ALTER TABLE `TrackingOrderActionLog`
  MODIFY COLUMN `carrier` ENUM('SPX', 'GHN', 'JNT') NOT NULL DEFAULT 'SPX';
