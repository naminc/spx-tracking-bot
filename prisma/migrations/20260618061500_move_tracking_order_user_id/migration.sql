-- Move userId next to telegramChatId for easier inspection in phpMyAdmin.
ALTER TABLE `TrackingOrder` DROP FOREIGN KEY `TrackingOrder_userId_fkey`;

ALTER TABLE `TrackingOrder`
MODIFY COLUMN `userId` INTEGER NULL AFTER `telegramChatId`;

ALTER TABLE `TrackingOrder`
ADD CONSTRAINT `TrackingOrder_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
