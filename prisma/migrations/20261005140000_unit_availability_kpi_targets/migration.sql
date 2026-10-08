-- PIC on failures, daily unit availability (PA), and KPI targets (card colours).

ALTER TABLE `maintenance_failures` ADD COLUMN `pic_user_id` INTEGER NULL;
CREATE INDEX `maintenance_failures_pic_idx` ON `maintenance_failures`(`pic_user_id`);
ALTER TABLE `maintenance_failures`
  ADD CONSTRAINT `maintenance_failures_pic_user_id_fkey` FOREIGN KEY (`pic_user_id`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Use Prisma's default constraint name for the actual PIC added in 20261005100000.
ALTER TABLE `maintenance_actuals` DROP FOREIGN KEY `maintenance_actuals_pic_fkey`;
ALTER TABLE `maintenance_actuals`
  ADD CONSTRAINT `maintenance_actuals_pic_user_id_fkey` FOREIGN KEY (`pic_user_id`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `unit_availability_days` (
    `id` VARCHAR(191) NOT NULL,
    `fleet_equipment_id` INTEGER NOT NULL,
    `project_id` VARCHAR(10) NOT NULL,
    `work_date` DATE NOT NULL,
    `planned_hours` DECIMAL(6, 2) NOT NULL,
    `downtime_hours` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `unit_availability_days_project_date_idx`(`project_id`, `work_date`),
    UNIQUE INDEX `unit_availability_days_unit_date_key`(`fleet_equipment_id`, `work_date`),
    PRIMARY KEY (`id`),
    CONSTRAINT `unit_availability_days_fleet_equipment_id_fkey` FOREIGN KEY (`fleet_equipment_id`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kpi_targets` (
    `id` VARCHAR(191) NOT NULL,
    `kpi_code` VARCHAR(40) NOT NULL,
    `project_id` VARCHAR(10) NOT NULL DEFAULT '*',
    `maintenance_type_id` VARCHAR(30) NOT NULL DEFAULT '*',
    `target_value` DECIMAL(10, 2) NOT NULL,
    `direction` ENUM('HIGHER', 'LOWER', 'COUNT_ZERO') NOT NULL,
    `yellow_margin` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `effective_from` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kpi_targets_scope_key`(`kpi_code`, `project_id`, `maintenance_type_id`, `effective_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Baseline targets from the Fundamental Maintenance Control spec v1.0 (section 6 and 11), all sites and programs.
-- Yellow margin uses the target's unit: 5 points below (HIGHER %), 10 points above (LOWER %), 10% of target for MTTR, 5% for MTBF.
INSERT INTO `kpi_targets` (`id`, `kpi_code`, `project_id`, `maintenance_type_id`, `target_value`, `direction`, `yellow_margin`, `effective_from`, `updated_at`) VALUES
  (UUID(), 'PM_COMPLIANCE',       '*', '*', 95.00, 'HIGHER',     5.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'ON_TIME_COMPLIANCE',  '*', '*', 90.00, 'HIGHER',     5.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'SCHEDULE_ADHERENCE',  '*', '*', 95.00, 'HIGHER',     5.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'OVERDUE_MAINTENANCE', '*', '*', 5.00,  'LOWER',      10.00, '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'BACKLOG_GT30',        '*', '*', 0.00,  'COUNT_ZERO', 0.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'QC_PASS_RATE',        '*', '*', 95.00, 'HIGHER',     5.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'FAILURE_CLOSURE',     '*', '*', 95.00, 'HIGHER',     5.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'CRITICAL_FAILURE',    '*', '*', 0.00,  'COUNT_ZERO', 0.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'REPEAT_FAILURE',      '*', '*', 5.00,  'LOWER',      10.00, '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'PA_AVAILABILITY',     '*', '*', 85.00, 'HIGHER',     5.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'MTBF',                '*', '*', 60.00, 'HIGHER',     3.00,  '2026-01-01', CURRENT_TIMESTAMP(3)),
  (UUID(), 'MTTR',                '*', '*', 12.00, 'LOWER',      1.20,  '2026-01-01', CURRENT_TIMESTAMP(3));
