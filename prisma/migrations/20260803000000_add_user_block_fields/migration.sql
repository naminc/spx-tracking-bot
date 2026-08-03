ALTER TABLE `User`
  ADD COLUMN `isBlocked` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `blockedAt` DATETIME(3) NULL,
  ADD COLUMN `blockedReason` VARCHAR(512) NULL,
  ADD COLUMN `blockedByAdminTelegramId` VARCHAR(64) NULL,
  ADD COLUMN `blockedByAdminUsername` VARCHAR(64) NULL;

CREATE INDEX `User_isBlocked_idx` ON `User`(`isBlocked`);
