-- Satu defect = satu baris failure. Actual berikutnya menambah follow selama belum ditutup.
-- Foto memakai attachments.entity_type MAINTENANCE_FAILURE.

CREATE TABLE `maintenance_failures` (
  `id` VARCHAR(191) NOT NULL,
  `sap_failure_code` VARCHAR(30) NULL,
  `project_id` VARCHAR(10) NOT NULL,
  `fleet_equipment_id` INTEGER NOT NULL,
  `maintenance_actual_id` VARCHAR(191) NULL,
  `severity` ENUM('CRITICAL', 'MAJOR', 'MINOR') NOT NULL,
  `description` TEXT NOT NULL,
  `occurred_at` DATETIME(3) NOT NULL,
  `closure_date` DATE NULL,
  `operating_hours` DECIMAL(12, 2) NULL,
  `created_by` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `maintenance_failures_project_occurred_idx`(`project_id`, `occurred_at`),
  INDEX `maintenance_failures_unit_occurred_idx`(`fleet_equipment_id`, `occurred_at`),
  INDEX `maintenance_failures_severity_closure_idx`(`severity`, `closure_date`),
  CONSTRAINT `maintenance_failures_unit_fkey` FOREIGN KEY (`fleet_equipment_id`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `maintenance_failures_actual_fkey` FOREIGN KEY (`maintenance_actual_id`) REFERENCES `maintenance_actuals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `maintenance_failures_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `maintenance_failure_follows` (
  `id` VARCHAR(191) NOT NULL,
  `maintenance_failure_id` VARCHAR(191) NOT NULL,
  `maintenance_actual_id` VARCHAR(191) NOT NULL,
  `progressed` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `maintenance_failure_follows_pair_key`(`maintenance_failure_id`, `maintenance_actual_id`),
  CONSTRAINT `maintenance_failure_follows_failure_fkey` FOREIGN KEY (`maintenance_failure_id`) REFERENCES `maintenance_failures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `maintenance_failure_follows_actual_fkey` FOREIGN KEY (`maintenance_actual_id`) REFERENCES `maintenance_actuals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `attachments`
  MODIFY `entity_type` ENUM(
    'MAINTENANCE_PLAN',
    'MAINTENANCE_ACTUAL',
    'INSPECTION',
    'PCR_FORECAST',
    'MAINTENANCE_FAILURE'
  ) NOT NULL;
