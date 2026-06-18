-- CreateTable
CREATE TABLE `TrackingOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trackingNumber` VARCHAR(64) NOT NULL,
    `telegramChatId` VARCHAR(64) NOT NULL,
    `currentStatus` VARCHAR(512) NOT NULL,
    `currentStatusCode` VARCHAR(128) NOT NULL,
    `currentLocation` VARCHAR(255) NULL,
    `nextLocation` VARCHAR(255) NULL,
    `milestoneCode` VARCHAR(128) NULL,
    `milestoneName` VARCHAR(255) NULL,
    `lastEventTime` DATETIME(3) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `finalStatus` ENUM('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TrackingOrder_isCompleted_idx`(`isCompleted`),
    INDEX `TrackingOrder_trackingNumber_idx`(`trackingNumber`),
    UNIQUE INDEX `TrackingOrder_trackingNumber_telegramChatId_key`(`trackingNumber`, `telegramChatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrackingHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `trackingCode` VARCHAR(128) NOT NULL,
    `trackingName` VARCHAR(255) NULL,
    `status` VARCHAR(512) NOT NULL,
    `location` VARCHAR(255) NULL,
    `nextLocation` VARCHAR(255) NULL,
    `description` VARCHAR(512) NULL,
    `buyerDescription` VARCHAR(512) NULL,
    `sellerDescription` VARCHAR(512) NULL,
    `milestoneCode` VARCHAR(128) NULL,
    `milestoneName` VARCHAR(255) NULL,
    `eventTime` DATETIME(3) NOT NULL,
    `rawData` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TrackingHistory_orderId_idx`(`orderId`),
    INDEX `TrackingHistory_eventTime_idx`(`eventTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TelegramUser` (
    `telegramId` VARCHAR(64) NOT NULL,
    `username` VARCHAR(64) NULL,
    `firstName` VARCHAR(128) NULL,
    `lastName` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TelegramUser_username_idx`(`username`),
    PRIMARY KEY (`telegramId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrackingHistory` ADD CONSTRAINT `TrackingHistory_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `TrackingOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
