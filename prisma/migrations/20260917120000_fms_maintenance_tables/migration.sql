-- FMS — Fundamental Maintenance System tables (unit via fleet_equipment_cache)

CREATE TABLE `maintenance_types` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `maintenance_plans` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `maintenance_type_id` VARCHAR(191) NOT NULL,
    `sum_plan` INTEGER NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `maintenance_plans_project_id_year_month_maintenance_type_id_key`(`project_id`, `year`, `month`, `maintenance_type_id`),
    INDEX `maintenance_plans_year_month_idx`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `maintenance_actuals` (
    `id` VARCHAR(191) NOT NULL,
    `maintenance_plan_id` VARCHAR(191) NOT NULL,
    `fleet_equipment_id` INTEGER NOT NULL,
    `maintenance_date` DATETIME(3) NOT NULL,
    `maintenance_time` VARCHAR(191) NULL,
    `hour_meter` INTEGER NOT NULL,
    `remarks` TEXT NULL,
    `mechanics` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `maintenance_actuals_maintenance_plan_id_idx`(`maintenance_plan_id`),
    INDEX `maintenance_actuals_fleet_equipment_id_idx`(`fleet_equipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attachments` (
    `id` VARCHAR(191) NOT NULL,
    `entity_type` ENUM('MAINTENANCE_PLAN', 'MAINTENANCE_ACTUAL') NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `file_type` VARCHAR(191) NULL,
    `file_size` INTEGER NULL,
    `storage_path` VARCHAR(191) NOT NULL,
    `uploaded_by` INTEGER NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `attachments_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `monthly_reports` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `monthly_reports_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `monthly_report_items` (
    `id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NOT NULL,
    `fleet_equipment_id` INTEGER NOT NULL,
    `maintenance_type_id` VARCHAR(191) NOT NULL,
    `project_snapshot` VARCHAR(191) NULL,
    `total_plan` INTEGER NOT NULL,
    `total_actual` INTEGER NOT NULL,
    `compliance_rate` DOUBLE NULL,
    `last_hour_meter` INTEGER NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `yearly_reports` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `yearly_reports_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `yearly_report_items` (
    `id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NOT NULL,
    `fleet_equipment_id` INTEGER NOT NULL,
    `maintenance_type_id` VARCHAR(191) NOT NULL,
    `project_snapshot` VARCHAR(191) NULL,
    `total_plan` INTEGER NOT NULL,
    `total_actual` INTEGER NOT NULL,
    `compliance_rate` DOUBLE NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_maintenance_type_id_fkey` FOREIGN KEY (`maintenance_type_id`) REFERENCES `maintenance_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `maintenance_actuals` ADD CONSTRAINT `maintenance_actuals_maintenance_plan_id_fkey` FOREIGN KEY (`maintenance_plan_id`) REFERENCES `maintenance_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `maintenance_actuals` ADD CONSTRAINT `maintenance_actuals_fleet_equipment_id_fkey` FOREIGN KEY (`fleet_equipment_id`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `maintenance_actuals` ADD CONSTRAINT `maintenance_actuals_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monthly_report_items` ADD CONSTRAINT `monthly_report_items_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `monthly_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `monthly_report_items` ADD CONSTRAINT `monthly_report_items_maintenance_type_id_fkey` FOREIGN KEY (`maintenance_type_id`) REFERENCES `maintenance_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `yearly_report_items` ADD CONSTRAINT `yearly_report_items_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `yearly_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `yearly_report_items` ADD CONSTRAINT `yearly_report_items_maintenance_type_id_fkey` FOREIGN KEY (`maintenance_type_id`) REFERENCES `maintenance_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
