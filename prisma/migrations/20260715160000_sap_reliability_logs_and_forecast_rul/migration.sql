-- SAP B1 reliability logs (health check + reconciliation) + lead-time sample + RUL by AI columns on pcr_forecast

-- AlterTable
ALTER TABLE `pcr_forecast` ADD COLUMN `rul_computed_at` DATETIME(3) NULL,
    ADD COLUMN `rul_confidence_high_date` DATE NULL,
    ADD COLUMN `rul_confidence_low_date` DATE NULL,
    ADD COLUMN `rul_estimated_date` DATE NULL,
    ADD COLUMN `rul_method` VARCHAR(30) NULL;

-- CreateTable
CREATE TABLE `sap_health_check_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_healthy` BOOLEAN NOT NULL,
    `latency_ms` INTEGER NULL,
    `error_message` TEXT NULL,

    INDEX `sap_health_check_log_checked_at_idx`(`checked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sap_reconciliation_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(10) NOT NULL,
    `id_rep` INTEGER NOT NULL,
    `sap_doc_num` VARCHAR(30) NOT NULL,
    `pcr_status` VARCHAR(20) NOT NULL,
    `sap_status` VARCHAR(20) NOT NULL,
    `detected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `resolved_by` INTEGER NULL,

    INDEX `sap_reconciliation_log_id_rep_entity_type_idx`(`id_rep`, `entity_type`),
    INDEX `sap_reconciliation_log_resolved_at_idx`(`resolved_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sap_lead_time_sample` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_rep` INTEGER NOT NULL,
    `comp_type` VARCHAR(50) NULL,
    `pr_doc_num` VARCHAR(30) NULL,
    `pr_date` DATE NULL,
    `po_doc_num` VARCHAR(30) NULL,
    `po_date` DATE NULL,
    `mi_doc_num` VARCHAR(30) NULL,
    `mi_date` DATE NULL,
    `lead_time_days` INTEGER NULL,
    `captured_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sap_lead_time_sample_comp_type_idx`(`comp_type`),
    UNIQUE INDEX `sap_lead_time_sample_id_rep_key`(`id_rep`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sap_reconciliation_log` ADD CONSTRAINT `sap_reconciliation_log_id_rep_fkey` FOREIGN KEY (`id_rep`) REFERENCES `replacement`(`id_rep`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sap_reconciliation_log` ADD CONSTRAINT `sap_reconciliation_log_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sap_lead_time_sample` ADD CONSTRAINT `sap_lead_time_sample_id_rep_fkey` FOREIGN KEY (`id_rep`) REFERENCES `replacement`(`id_rep`) ON DELETE RESTRICT ON UPDATE CASCADE;
