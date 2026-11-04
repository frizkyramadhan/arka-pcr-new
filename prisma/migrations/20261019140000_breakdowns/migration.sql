-- Breakdown (OSCL / service call) and its activities (OCLG).
CREATE TABLE `breakdowns` (
  `id` VARCHAR(191) NOT NULL,
  `project_code` VARCHAR(10) NOT NULL,
  `fleet_equipment_id` INTEGER NOT NULL,
  `started_at` DATETIME(3) NOT NULL,
  `finished_at` DATETIME(3) NULL,
  `problem` TEXT NOT NULL,
  `resolution` VARCHAR(254) NULL,
  `hour_meter` DECIMAL(12, 2) NULL,
  `operator_name` VARCHAR(100) NULL,
  `work_order` VARCHAR(30) NOT NULL,
  `sap_service_call_id` INTEGER NOT NULL,
  `work_order_status` ENUM('OPEN', 'CLOSE') NOT NULL,
  `component_code` VARCHAR(50) NULL,
  `component_name` VARCHAR(100) NULL,
  `remark` VARCHAR(200) NULL,
  `created_by` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `breakdowns_project_started_idx` (`project_code`, `started_at`),
  INDEX `breakdowns_unit_started_idx` (`fleet_equipment_id`, `started_at`),
  INDEX `breakdowns_finished_idx` (`finished_at`),
  CONSTRAINT `breakdowns_unit_fkey` FOREIGN KEY (`fleet_equipment_id`) REFERENCES `fleet_equipment_cache` (`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `breakdowns_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `breakdown_activities` (
  `id` VARCHAR(191) NOT NULL,
  `breakdown_id` VARCHAR(191) NOT NULL,
  `sap_activity_code` INTEGER NOT NULL,
  `activity_category` VARCHAR(8) NOT NULL,
  `breakdown_code` VARCHAR(8) NOT NULL,
  `breakdown_code_name` VARCHAR(100) NOT NULL,
  `position_status` ENUM('BD', 'OP', 'SB', 'AJ') NOT NULL,
  `started_at` DATETIME(3) NOT NULL,
  `ended_at` DATETIME(3) NULL,
  `closed_at` DATETIME(3) NULL,
  `details` TEXT NOT NULL,
  `technician_name` VARCHAR(30) NULL,
  `technician_qty` DECIMAL(16, 6) NULL,
  `handled_by` INTEGER NULL,
  `created_by` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `breakdown_activities_parent_started_idx` (`breakdown_id`, `started_at`),
  INDEX `breakdown_activities_position_started_idx` (`position_status`, `started_at`),
  CONSTRAINT `breakdown_activities_parent_fkey` FOREIGN KEY (`breakdown_id`) REFERENCES `breakdowns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `breakdown_activities_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user` (`id_user`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
