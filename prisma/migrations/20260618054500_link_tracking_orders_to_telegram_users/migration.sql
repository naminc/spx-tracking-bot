-- AlterTable
ALTER TABLE `TrackingOrder` ADD COLUMN `telegramUserId` VARCHAR(64) NULL;

-- Backfill users for existing Telegram chat orders.
INSERT IGNORE INTO `TelegramUser` (`telegramId`, `username`, `firstName`, `lastName`, `createdAt`)
SELECT DISTINCT `telegramChatId`, NULL, NULL, NULL, CURRENT_TIMESTAMP(3)
FROM `TrackingOrder`
WHERE `telegramChatId` <> 'api';

-- Backfill tracking orders with their owning Telegram user id.
UPDATE `TrackingOrder`
SET `telegramUserId` = `telegramChatId`
WHERE `telegramChatId` <> 'api';

-- CreateIndex
CREATE INDEX `TrackingOrder_telegramUserId_idx` ON `TrackingOrder`(`telegramUserId`);

-- AddForeignKey
ALTER TABLE `TrackingOrder`
ADD CONSTRAINT `TrackingOrder_telegramUserId_fkey`
FOREIGN KEY (`telegramUserId`) REFERENCES `TelegramUser`(`telegramId`)
ON DELETE SET NULL ON UPDATE CASCADE;
