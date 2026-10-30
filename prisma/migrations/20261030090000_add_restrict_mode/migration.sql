ALTER TABLE `AppSetting`
  ADD COLUMN `restrictModeEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `restrictModeMessage` VARCHAR(2048) NULL;

CREATE TABLE `BotRestrictAllowListEntry` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `telegramUserId` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `BotRestrictAllowListEntry_telegramUserId_key`(`telegramUserId`),
  INDEX `BotRestrictAllowListEntry_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
