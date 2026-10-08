-- Status, QC, PIC, and closed time on maintenance actuals (Fase 4 QC).
-- Every existing actual was saved when the work was done, so it becomes CLOSED at its maintenance date.
ALTER TABLE `maintenance_actuals`
  ADD COLUMN `status` ENUM('OPEN', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'CLOSED',
  ADD COLUMN `qc_status` ENUM('PASS', 'FAIL', 'NA') NULL,
  ADD COLUMN `pic_user_id` INTEGER NULL,
  ADD COLUMN `closed_at` DATETIME(3) NULL,
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `maintenance_actuals`
SET `closed_at` = `maintenance_date`,
    `updated_at` = `created_at`
WHERE `status` = 'CLOSED';

CREATE INDEX `maintenance_actuals_plan_status_idx` ON `maintenance_actuals`(`maintenance_plan_id`, `status`);
CREATE INDEX `maintenance_actuals_unit_status_idx` ON `maintenance_actuals`(`fleet_equipment_id`, `status`);
CREATE INDEX `maintenance_actuals_pic_idx` ON `maintenance_actuals`(`pic_user_id`);

ALTER TABLE `maintenance_actuals`
  ADD CONSTRAINT `maintenance_actuals_pic_fkey` FOREIGN KEY (`pic_user_id`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;
