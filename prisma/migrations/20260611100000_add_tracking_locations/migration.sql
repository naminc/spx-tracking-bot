-- AlterTable
ALTER TABLE `TrackingOrder`
    ADD COLUMN `currentLocation` VARCHAR(255) NULL,
    ADD COLUMN `nextLocation` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `TrackingHistory`
    ADD COLUMN `location` VARCHAR(255) NULL,
    ADD COLUMN `nextLocation` VARCHAR(255) NULL;

-- Backfill existing tracking records from stored SPX raw payloads.
UPDATE `TrackingHistory`
SET
    `location` = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`rawData`, '$.location')), 'null'),
    `nextLocation` = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`rawData`, '$.next_location')), 'null');

UPDATE `TrackingOrder` AS `o`
JOIN `TrackingHistory` AS `h`
    ON `h`.`orderId` = `o`.`id`
    AND `h`.`eventTime` = `o`.`lastEventTime`
SET
    `o`.`currentLocation` = `h`.`location`,
    `o`.`nextLocation` = `h`.`nextLocation`;
