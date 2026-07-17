-- Multi BA PCR per forecast: resubmit creates new row with new number; old rows kept as history.
ALTER TABLE `ba_pcr` DROP INDEX `ba_pcr_id_forecast_key`;
ALTER TABLE `ba_pcr` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX `ba_pcr_id_forecast_is_active_idx` ON `ba_pcr`(`id_forecast`, `is_active`);
