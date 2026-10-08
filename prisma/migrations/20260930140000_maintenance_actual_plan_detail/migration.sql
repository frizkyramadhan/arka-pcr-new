-- Actual baru menempel ke satu plan detail (unit + plan date).
-- Baris lama yang menempel ke kuota bulan dibiarkan dengan detail null.

ALTER TABLE `maintenance_actuals`
  ADD COLUMN `maintenance_plan_detail_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `maintenance_actuals_maintenance_plan_detail_id_key`
  ON `maintenance_actuals`(`maintenance_plan_detail_id`);

ALTER TABLE `maintenance_actuals`
  ADD CONSTRAINT `maintenance_actuals_plan_detail_fkey`
  FOREIGN KEY (`maintenance_plan_detail_id`) REFERENCES `maintenance_plan_details`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
