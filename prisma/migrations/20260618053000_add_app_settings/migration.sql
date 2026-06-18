-- CreateTable
CREATE TABLE `AppSetting` (
    `id` INTEGER NOT NULL,
    `adminContact` VARCHAR(128) NOT NULL,
    `maintenanceEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
