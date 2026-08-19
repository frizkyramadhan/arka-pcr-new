-- Spatie-style activity log (subject/causer morphs + attribute_changes + properties).
CREATE TABLE `activity_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `log_name` VARCHAR(50) NULL,
    `description` TEXT NOT NULL,
    `subject_type` VARCHAR(100) NULL,
    `subject_id` INTEGER NULL,
    `event` VARCHAR(50) NULL,
    `causer_type` VARCHAR(100) NULL,
    `causer_id` INTEGER NULL,
    `attribute_changes` JSON NULL,
    `properties` JSON NULL,
    `batch_uuid` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `activity_log_log_name_idx`(`log_name`),
    INDEX `activity_log_subject_type_subject_id_idx`(`subject_type`, `subject_id`),
    INDEX `activity_log_causer_type_causer_id_idx`(`causer_type`, `causer_id`),
    INDEX `activity_log_event_idx`(`event`),
    INDEX `activity_log_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_causer_id_fkey` FOREIGN KEY (`causer_id`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;
