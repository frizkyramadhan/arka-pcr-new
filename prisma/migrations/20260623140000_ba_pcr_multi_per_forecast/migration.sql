-- Multi BA PCR per forecast: resubmit creates new row with new number; old rows kept as history.
-- MySQL 1553: unique index ba_pcr_id_forecast_key is required by FK ba_pcr_id_forecast_fkey,
-- so drop the FK first, then the unique index, then restore a non-unique FK.
ALTER TABLE `ba_pcr` DROP FOREIGN KEY `ba_pcr_id_forecast_fkey`;
ALTER TABLE `ba_pcr` DROP INDEX `ba_pcr_id_forecast_key`;
ALTER TABLE `ba_pcr` ADD CONSTRAINT `ba_pcr_id_forecast_fkey` FOREIGN KEY (`id_forecast`) REFERENCES `pcr_forecast`(`id_forecast`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ba_pcr` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX `ba_pcr_id_forecast_is_active_idx` ON `ba_pcr`(`id_forecast`, `is_active`);
