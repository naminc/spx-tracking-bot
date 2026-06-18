CREATE TABLE `Broadcast` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('DRAFT', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'DRAFT',
  `targetType` VARCHAR(32) NOT NULL,
  `totalCount` INTEGER NOT NULL DEFAULT 0,
  `sentCount` INTEGER NOT NULL DEFAULT 0,
  `failedCount` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `sentAt` DATETIME(3) NULL,

  INDEX `Broadcast_status_idx`(`status`),
  INDEX `Broadcast_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BroadcastRecipient` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `broadcastId` INTEGER NOT NULL,
  `userId` INTEGER NULL,
  `telegramUserId` VARCHAR(64) NOT NULL,
  `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `errorMessage` VARCHAR(512) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `BroadcastRecipient_broadcastId_idx`(`broadcastId`),
  INDEX `BroadcastRecipient_userId_idx`(`userId`),
  INDEX `BroadcastRecipient_telegramUserId_idx`(`telegramUserId`),
  INDEX `BroadcastRecipient_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BroadcastRecipient`
  ADD CONSTRAINT `BroadcastRecipient_broadcastId_fkey`
  FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BroadcastRecipient`
  ADD CONSTRAINT `BroadcastRecipient_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
