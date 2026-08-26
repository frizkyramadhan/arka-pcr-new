-- Audit table for email notification sends (success / fail / skipped).
CREATE TABLE `notification_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(30) NULL,
    `entity_id` VARCHAR(50) NULL,
    `recipient` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `error_message` TEXT NULL,
    `message_id` VARCHAR(255) NULL,
    `dedupe_key` VARCHAR(120) NULL,
    `sent_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_log_event_created_at_idx`(`event`, `created_at`),
    INDEX `notification_log_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `notification_log_dedupe_key_idx`(`dedupe_key`),
    INDEX `notification_log_sent_by_idx`(`sent_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
