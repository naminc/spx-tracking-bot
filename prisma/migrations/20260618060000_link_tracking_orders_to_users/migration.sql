-- CreateTable
CREATE TABLE `User` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `telegramUserId` VARCHAR(64) NOT NULL,
  `username` VARCHAR(64) NULL,
  `firstName` VARCHAR(128) NULL,
  `lastName` VARCHAR(128) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `User_telegramUserId_key`(`telegramUserId`),
  INDEX `User_username_idx`(`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve collected Telegram users, if any.
INSERT IGNORE INTO `User` (`telegramUserId`, `username`, `firstName`, `lastName`, `createdAt`)
SELECT `telegramId`, `username`, `firstName`, `lastName`, `createdAt`
FROM `TelegramUser`;

-- AlterTable
ALTER TABLE `TrackingOrder` DROP FOREIGN KEY `TrackingOrder_telegramUserId_fkey`;
DROP INDEX `TrackingOrder_telegramUserId_idx` ON `TrackingOrder`;
ALTER TABLE `TrackingOrder` DROP COLUMN `telegramUserId`, ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `TrackingOrder_userId_idx` ON `TrackingOrder`(`userId`);

-- AddForeignKey
ALTER TABLE `TrackingOrder`
ADD CONSTRAINT `TrackingOrder_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable
DROP TABLE `TelegramUser`;
