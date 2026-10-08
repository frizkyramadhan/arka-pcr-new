-- Plan menjadi satu jadwal per unit + program + tanggal.
-- Baris kuota lama tetap ada: unit dan plan_date kosong, sum_plan tidak dihapus.

ALTER TABLE `maintenance_plans`
  ADD COLUMN `fleet_equipment_id` INTEGER NULL,
  ADD COLUMN `plan_date` DATE NULL,
  MODIFY `sum_plan` INTEGER NULL;

DROP INDEX `maintenance_plans_project_id_year_month_maintenance_type_id_key` ON `maintenance_plans`;

CREATE UNIQUE INDEX `maintenance_plans_unit_type_plan_date_key`
  ON `maintenance_plans`(`fleet_equipment_id`, `maintenance_type_id`, `plan_date`);

CREATE INDEX `maintenance_plans_project_id_plan_date_idx`
  ON `maintenance_plans`(`project_id`, `plan_date`);

ALTER TABLE `maintenance_plans`
  ADD CONSTRAINT `maintenance_plans_fleet_equipment_id_fkey`
  FOREIGN KEY (`fleet_equipment_id`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
