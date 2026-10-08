-- Header plan kembali unik per site + tahun + bulan + program.
-- Tanggal per unit pindah ke maintenance_plan_details. Kuota lama (tanpa tanggal) tetap di sum_plan.

CREATE TABLE `maintenance_plan_details` (
  `id` VARCHAR(191) NOT NULL,
  `maintenance_plan_id` VARCHAR(191) NOT NULL,
  `fleet_equipment_id` INTEGER NOT NULL,
  `plan_date` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `maintenance_plan_details_plan_unit_date_key`(`maintenance_plan_id`, `fleet_equipment_id`, `plan_date`),
  INDEX `maintenance_plan_details_fleet_equipment_id_plan_date_idx`(`fleet_equipment_id`, `plan_date`),
  CONSTRAINT `maintenance_plan_details_plan_fkey` FOREIGN KEY (`maintenance_plan_id`) REFERENCES `maintenance_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `maintenance_plan_details_unit_fkey` FOREIGN KEY (`fleet_equipment_id`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `maintenance_plan_details` (`id`, `maintenance_plan_id`, `fleet_equipment_id`, `plan_date`, `created_at`)
SELECT
  REPLACE(UUID(), '-', ''),
  header.header_id,
  p.fleet_equipment_id,
  p.plan_date,
  p.created_at
FROM `maintenance_plans` p
INNER JOIN (
  SELECT `project_id`, `year`, `month`, `maintenance_type_id`, MIN(`id`) AS header_id
  FROM `maintenance_plans`
  WHERE `plan_date` IS NOT NULL AND `fleet_equipment_id` IS NOT NULL
  GROUP BY `project_id`, `year`, `month`, `maintenance_type_id`
) header
  ON header.project_id = p.project_id
 AND header.year = p.year
 AND header.month = p.month
 AND header.maintenance_type_id = p.maintenance_type_id
WHERE p.plan_date IS NOT NULL AND p.fleet_equipment_id IS NOT NULL;

UPDATE `maintenance_actuals` a
INNER JOIN `maintenance_plans` p ON p.id = a.maintenance_plan_id
INNER JOIN (
  SELECT `project_id`, `year`, `month`, `maintenance_type_id`, MIN(`id`) AS header_id
  FROM `maintenance_plans`
  WHERE `plan_date` IS NOT NULL AND `fleet_equipment_id` IS NOT NULL
  GROUP BY `project_id`, `year`, `month`, `maintenance_type_id`
) header
  ON header.project_id = p.project_id
 AND header.year = p.year
 AND header.month = p.month
 AND header.maintenance_type_id = p.maintenance_type_id
SET a.maintenance_plan_id = header.header_id
WHERE p.id <> header.header_id;

DELETE p FROM `maintenance_plans` p
INNER JOIN (
  SELECT `project_id`, `year`, `month`, `maintenance_type_id`, header_id
  FROM (
    SELECT `project_id`, `year`, `month`, `maintenance_type_id`, MIN(`id`) AS header_id
    FROM `maintenance_plans`
    WHERE `plan_date` IS NOT NULL AND `fleet_equipment_id` IS NOT NULL
    GROUP BY `project_id`, `year`, `month`, `maintenance_type_id`
  ) grouped
) header
  ON header.project_id = p.project_id
 AND header.year = p.year
 AND header.month = p.month
 AND header.maintenance_type_id = p.maintenance_type_id
WHERE p.id <> header.header_id;

UPDATE `maintenance_plans` p
INNER JOIN (
  SELECT `maintenance_plan_id`, COUNT(*) AS detail_count
  FROM `maintenance_plan_details`
  GROUP BY `maintenance_plan_id`
) d ON d.maintenance_plan_id = p.id
SET p.sum_plan = d.detail_count;

ALTER TABLE `maintenance_plans` DROP FOREIGN KEY `maintenance_plans_fleet_equipment_id_fkey`;
DROP INDEX `maintenance_plans_unit_type_plan_date_key` ON `maintenance_plans`;
DROP INDEX `maintenance_plans_project_id_plan_date_idx` ON `maintenance_plans`;

ALTER TABLE `maintenance_plans`
  DROP COLUMN `fleet_equipment_id`,
  DROP COLUMN `plan_date`;

CREATE UNIQUE INDEX `maintenance_plans_project_id_year_month_maintenance_type_id_key`
  ON `maintenance_plans`(`project_id`, `year`, `month`, `maintenance_type_id`);
