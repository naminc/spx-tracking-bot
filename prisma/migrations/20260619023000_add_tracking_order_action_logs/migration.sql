CREATE TABLE `TrackingOrderActionLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `action` ENUM('ADD', 'REMOVE') NOT NULL,
  `source` ENUM('TELEGRAM', 'ADMIN') NOT NULL,
  `trackingNumber` VARCHAR(64) NOT NULL,
  `telegramChatId` VARCHAR(64) NULL,
  `userId` INTEGER NULL,
  `orderId` INTEGER NULL,
  `adminTelegramId` VARCHAR(64) NULL,
  `adminUsername` VARCHAR(64) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `TrackingOrderActionLog_action_idx`(`action`),
  INDEX `TrackingOrderActionLog_source_idx`(`source`),
  INDEX `TrackingOrderActionLog_trackingNumber_idx`(`trackingNumber`),
  INDEX `TrackingOrderActionLog_telegramChatId_idx`(`telegramChatId`),
  INDEX `TrackingOrderActionLog_userId_idx`(`userId`),
  INDEX `TrackingOrderActionLog_orderId_idx`(`orderId`),
  INDEX `TrackingOrderActionLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TrackingOrderActionLog`
  ADD CONSTRAINT `TrackingOrderActionLog_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TrackingOrderActionLog`
  ADD CONSTRAINT `TrackingOrderActionLog_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `TrackingOrder`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
