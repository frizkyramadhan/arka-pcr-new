-- Complete partial migration (steps 5-7)

-- Approval: drop legacy id_forecast column (if still present)
ALTER TABLE `pcr_forecast_approval`
  DROP INDEX `pcr_forecast_approval_id_forecast_level_key`,
  DROP COLUMN `id_forecast`;

ALTER TABLE `pcr_forecast_approval`
  MODIFY `id_ba_pcr` INTEGER NOT NULL;

CREATE UNIQUE INDEX `uq_forecast_approval_level` ON `pcr_forecast_approval`(`id_ba_pcr`, `level`);

-- PcrForecast: drop moved columns (submitted_by FK already removed in partial run)
ALTER TABLE `pcr_forecast`
  DROP COLUMN `no_ba_pcr`,
  DROP COLUMN `ba_pcr_status`,
  DROP COLUMN `status_ba_pcr`,
  DROP COLUMN `ba_submitted_at`,
  DROP COLUMN `submitted_by`,
  DROP COLUMN `action_date`,
  DROP COLUMN `po_number`;

DROP INDEX `pcr_forecast_status_ba_pcr_status_idx` ON `pcr_forecast`;

-- Foreign keys for ba_pcr (skip if already exist)
ALTER TABLE `ba_pcr`
  ADD CONSTRAINT `ba_pcr_id_forecast_fkey` FOREIGN KEY (`id_forecast`) REFERENCES `pcr_forecast`(`id_forecast`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ba_pcr_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pcr_forecast_approval`
  ADD CONSTRAINT `pcr_forecast_approval_id_ba_pcr_fkey` FOREIGN KEY (`id_ba_pcr`) REFERENCES `ba_pcr`(`id_ba_pcr`) ON DELETE CASCADE ON UPDATE CASCADE;
