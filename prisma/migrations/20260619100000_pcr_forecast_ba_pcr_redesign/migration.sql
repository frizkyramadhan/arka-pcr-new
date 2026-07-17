-- PCR Forecast redesign: split BA to ba_pcr, procurement on replacement

-- 1. Replacement: procurement + oldcore columns
ALTER TABLE `replacement`
  ADD COLUMN `mr_no` VARCHAR(30) NULL AFTER `wo_end_date`,
  ADD COLUMN `pr_no` VARCHAR(30) NULL AFTER `mr_no`,
  ADD COLUMN `po_no` VARCHAR(30) NULL AFTER `pr_no`,
  ADD COLUMN `return_oldcore_date` DATE NULL AFTER `po_no`,
  ADD COLUMN `spb_ba_return_oldcore` VARCHAR(50) NULL AFTER `return_oldcore_date`;

-- 2. Migrate PO from forecast to linked replacement
UPDATE `replacement` r
INNER JOIN `pcr_forecast` f ON f.`id_rep` = r.`id_rep`
SET r.`po_no` = f.`po_number`
WHERE f.`po_number` IS NOT NULL AND f.`po_number` != '';

-- 3. PcrForecast: rename status, add new columns
ALTER TABLE `pcr_forecast`
  CHANGE COLUMN `status` `forecast_status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  ADD COLUMN `rating_cbm` VARCHAR(20) NULL AFTER `rating_sos`,
  ADD COLUMN `converted_at` DATETIME(3) NULL AFTER `id_rep`;

-- Set converted_at for forecasts already linked to replacement
UPDATE `pcr_forecast`
SET `converted_at` = `updated_at`
WHERE `id_rep` IS NOT NULL;

-- 4. Create ba_pcr and migrate BA fields from pcr_forecast
CREATE TABLE `ba_pcr` (
  `id_ba_pcr` INTEGER NOT NULL AUTO_INCREMENT,
  `id_forecast` INTEGER NOT NULL,
  `no_ba_pcr` VARCHAR(40) NULL,
  `ba_pcr_date` DATE NULL,
  `ba_pcr_status` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
  `status_ba_pcr` VARCHAR(100) NULL,
  `submitted_by` INTEGER NULL,
  `approved_at` DATETIME(3) NULL,
  `rejected_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ba_pcr_id_forecast_key`(`id_forecast`),
  UNIQUE INDEX `ba_pcr_no_ba_pcr_key`(`no_ba_pcr`),
  INDEX `ba_pcr_ba_pcr_status_idx`(`ba_pcr_status`),
  PRIMARY KEY (`id_ba_pcr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ba_pcr` (
  `id_forecast`,
  `no_ba_pcr`,
  `ba_pcr_date`,
  `ba_pcr_status`,
  `status_ba_pcr`,
  `submitted_by`,
  `approved_at`,
  `rejected_at`,
  `created_at`,
  `updated_at`
)
SELECT
  f.`id_forecast`,
  f.`no_ba_pcr`,
  f.`ba_submitted_at`,
  f.`ba_pcr_status`,
  f.`status_ba_pcr`,
  f.`submitted_by`,
  CASE WHEN f.`ba_pcr_status` = 'APPROVED' THEN f.`updated_at` ELSE NULL END,
  CASE WHEN f.`ba_pcr_status` = 'REJECTED' THEN f.`updated_at` ELSE NULL END,
  f.`created_at`,
  f.`updated_at`
FROM `pcr_forecast` f
WHERE f.`deleted_at` IS NULL
  AND (
    f.`ba_pcr_status` != 'PENDING'
    OR f.`no_ba_pcr` IS NOT NULL
    OR f.`ba_submitted_at` IS NOT NULL
    OR f.`submitted_by` IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM `pcr_forecast_approval` a WHERE a.`id_forecast` = f.`id_forecast`
    )
  );

-- 5. Approval: add id_ba_pcr, migrate, drop id_forecast
ALTER TABLE `pcr_forecast_approval` ADD COLUMN `id_ba_pcr` INTEGER NULL AFTER `id_forecast_approval`;

UPDATE `pcr_forecast_approval` a
INNER JOIN `ba_pcr` b ON b.`id_forecast` = a.`id_forecast`
SET a.`id_ba_pcr` = b.`id_ba_pcr`;

DELETE FROM `pcr_forecast_approval` WHERE `id_ba_pcr` IS NULL;

ALTER TABLE `pcr_forecast_approval`
  DROP FOREIGN KEY `pcr_forecast_approval_id_forecast_fkey`,
  DROP INDEX `uq_forecast_approval_level`,
  DROP COLUMN `id_forecast`;

ALTER TABLE `pcr_forecast_approval`
  MODIFY `id_ba_pcr` INTEGER NOT NULL;

CREATE UNIQUE INDEX `uq_forecast_approval_level` ON `pcr_forecast_approval`(`id_ba_pcr`, `level`);

-- 6. Drop moved columns from pcr_forecast
ALTER TABLE `pcr_forecast`
  DROP FOREIGN KEY `pcr_forecast_submitted_by_fkey`,
  DROP COLUMN `no_ba_pcr`,
  DROP COLUMN `ba_pcr_status`,
  DROP COLUMN `status_ba_pcr`,
  DROP COLUMN `ba_submitted_at`,
  DROP COLUMN `submitted_by`,
  DROP COLUMN `action_date`,
  DROP COLUMN `po_number`;

DROP INDEX `pcr_forecast_status_ba_pcr_status_idx` ON `pcr_forecast`;

CREATE INDEX `pcr_forecast_fleetUnitId_id_mod_forecast_status_idx` ON `pcr_forecast`(`id_unit`, `id_mod`, `forecast_status`);

-- 7. Foreign keys
ALTER TABLE `ba_pcr`
  ADD CONSTRAINT `ba_pcr_id_forecast_fkey` FOREIGN KEY (`id_forecast`) REFERENCES `pcr_forecast`(`id_forecast`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ba_pcr_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pcr_forecast_approval`
  ADD CONSTRAINT `pcr_forecast_approval_id_ba_pcr_fkey` FOREIGN KEY (`id_ba_pcr`) REFERENCES `ba_pcr`(`id_ba_pcr`) ON DELETE CASCADE ON UPDATE CASCADE;
