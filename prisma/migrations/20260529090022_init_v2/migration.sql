-- CreateTable
CREATE TABLE `fleet_equipment_cache` (
    `fleet_equipment_id` INTEGER NOT NULL,
    `unit_no` VARCHAR(20) NOT NULL,
    `description` VARCHAR(200) NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `fleet_model_id` INTEGER NOT NULL,
    `model_name` VARCHAR(50) NULL,
    `manufacture` VARCHAR(50) NULL,
    `unit_status` VARCHAR(20) NULL,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fleet_equipment_cache_unit_no_idx`(`unit_no`),
    INDEX `fleet_equipment_cache_project_code_idx`(`project_code`),
    INDEX `fleet_equipment_cache_fleet_model_id_idx`(`fleet_model_id`),
    PRIMARY KEY (`fleet_equipment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_unit_mapping` (
    `legacy_unit_id` INTEGER NOT NULL,
    `fleet_equipment_id` INTEGER NOT NULL,
    `legacy_unit_no` VARCHAR(20) NULL,
    `mapped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `legacy_unit_mapping_fleet_equipment_id_idx`(`fleet_equipment_id`),
    PRIMARY KEY (`legacy_unit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comp` (
    `id_comp` INTEGER NOT NULL AUTO_INCREMENT,
    `comp_desc` VARCHAR(50) NOT NULL,
    `comp_type` VARCHAR(50) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'Active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_comp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commod` (
    `id_mod` INTEGER NOT NULL AUTO_INCREMENT,
    `id_model` INTEGER NOT NULL,
    `id_comp` INTEGER NOT NULL,
    `policy` INTEGER NULL,
    `price` DECIMAL(15, 2) NULL,
    `life_type` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `commod_id_model_idx`(`id_model`),
    UNIQUE INDEX `commod_id_model_id_comp_key`(`id_model`, `id_comp`),
    PRIMARY KEY (`id_mod`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hm` (
    `id_hm` INTEGER NOT NULL AUTO_INCREMENT,
    `id_unit` INTEGER NOT NULL,
    `hm_unit` DECIMAL(12, 2) NOT NULL,
    `wh_day` INTEGER NOT NULL,
    `date_hm` DATE NOT NULL,
    `is_official` BOOLEAN NOT NULL DEFAULT true,
    `unit_no` VARCHAR(20) NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `hm_id_unit_date_hm_id_hm_idx`(`id_unit`, `date_hm`, `id_hm`),
    INDEX `hm_project_code_idx`(`project_code`),
    PRIMARY KEY (`id_hm`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `replacement` (
    `id_rep` INTEGER NOT NULL AUTO_INCREMENT,
    `rep_date` DATE NOT NULL,
    `last_rep_date` DATE NULL,
    `id_unit` INTEGER NOT NULL,
    `id_mod` INTEGER NOT NULL,
    `hm_rep` DECIMAL(12, 2) NOT NULL,
    `last_hm_rep` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `wo_no` VARCHAR(30) NULL,
    `wo_date` DATE NULL,
    `wo_status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `wo_end_date` DATE NULL,
    `comp_hour` INTEGER NULL,
    `comp_life` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `life_percent` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `life_calculated_at` DATETIME(3) NULL,
    `comp_cond` VARCHAR(1) NOT NULL DEFAULT 'A',
    `remarks` TEXT NOT NULL,
    `report` VARCHAR(255) NULL,
    `unit_no` VARCHAR(20) NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `replacement_id_unit_id_mod_wo_status_idx`(`id_unit`, `id_mod`, `wo_status`),
    INDEX `replacement_wo_no_idx`(`wo_no`),
    INDEX `replacement_project_code_idx`(`project_code`),
    PRIMARY KEY (`id_rep`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pcr_forecast` (
    `id_forecast` INTEGER NOT NULL AUTO_INCREMENT,
    `id_unit` INTEGER NOT NULL,
    `id_mod` INTEGER NOT NULL,
    `model_name` VARCHAR(50) NULL,
    `unit_no` VARCHAR(20) NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `comp_desc` VARCHAR(50) NULL,
    `hm_component` DECIMAL(12, 2) NOT NULL,
    `policy` INTEGER NULL,
    `life_percent` DECIMAL(6, 2) NOT NULL,
    `rating_sos` VARCHAR(1) NULL,
    `price_component` DECIMAL(15, 2) NULL,
    `snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `plan_period` DATE NOT NULL,
    `quarter` VARCHAR(2) NOT NULL,
    `no_ba_pcr` VARCHAR(30) NULL,
    `ba_pcr_status` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    `status_ba_pcr` VARCHAR(100) NULL,
    `ba_submitted_at` DATE NULL,
    `submitted_by` INTEGER NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `action_date` DATE NULL,
    `po_number` VARCHAR(30) NULL,
    `remark` TEXT NULL,
    `id_rep` INTEGER NULL,
    `source` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `pcr_forecast_id_rep_key`(`id_rep`),
    INDEX `pcr_forecast_project_code_quarter_plan_period_idx`(`project_code`, `quarter`, `plan_period`),
    INDEX `pcr_forecast_id_unit_id_mod_status_idx`(`id_unit`, `id_mod`, `status`),
    INDEX `pcr_forecast_status_ba_pcr_status_idx`(`status`, `ba_pcr_status`),
    PRIMARY KEY (`id_forecast`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pcr_forecast_approval` (
    `id_forecast_approval` INTEGER NOT NULL AUTO_INCREMENT,
    `id_forecast` INTEGER NOT NULL,
    `level` VARCHAR(5) NOT NULL,
    `step_order` INTEGER NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `approver_label` VARCHAR(100) NULL,
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `note` TEXT NULL,

    INDEX `pcr_forecast_approval_level_status_idx`(`level`, `status`),
    UNIQUE INDEX `pcr_forecast_approval_id_forecast_level_key`(`id_forecast`, `level`),
    PRIMARY KEY (`id_forecast_approval`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sos` (
    `id_sos` INTEGER NOT NULL AUTO_INCREMENT,
    `id_unit` INTEGER NOT NULL,
    `id_mod` INTEGER NOT NULL,
    `type` VARCHAR(10) NOT NULL DEFAULT 'SOS',
    `sample_date` DATE NOT NULL,
    `lab_name` VARCHAR(100) NULL,
    `lab_no` VARCHAR(50) NULL,
    `oil_type` VARCHAR(100) NULL,
    `h_oil` INTEGER NULL,
    `h_unit` INTEGER NULL,
    `eval_code` VARCHAR(5) NULL,
    `recommendation` TEXT NULL,
    `oil_change` BOOLEAN NULL DEFAULT false,
    `oil_added` BOOLEAN NULL DEFAULT false,
    `fe` DECIMAL(8, 3) NULL,
    `cu` DECIMAL(8, 3) NULL,
    `cr` DECIMAL(8, 3) NULL,
    `si` DECIMAL(8, 3) NULL,
    `al` DECIMAL(8, 3) NULL,
    `ni` DECIMAL(8, 3) NULL,
    `sn` DECIMAL(8, 3) NULL,
    `pb` DECIMAL(8, 3) NULL,
    `pq` DECIMAL(8, 3) NULL,
    `soot` DECIMAL(8, 3) NULL,
    `oxid` DECIMAL(8, 3) NULL,
    `nitr` DECIMAL(8, 3) NULL,
    `sox` DECIMAL(8, 3) NULL,
    `4um` DECIMAL(8, 3) NULL,
    `6um` DECIMAL(8, 3) NULL,
    `14um` DECIMAL(8, 3) NULL,
    `15um` DECIMAL(8, 3) NULL,
    `iso4406` VARCHAR(20) NULL,
    `iso14` VARCHAR(20) NULL,
    `iso6` VARCHAR(20) NULL,
    `ca` DECIMAL(8, 3) NULL,
    `zn` DECIMAL(8, 3) NULL,
    `mo` DECIMAL(8, 3) NULL,
    `bo` DECIMAL(8, 3) NULL,
    `p` DECIMAL(8, 3) NULL,
    `na` DECIMAL(8, 3) NULL,
    `k` DECIMAL(8, 3) NULL,
    `mg` DECIMAL(8, 3) NULL,
    `visc` DECIMAL(8, 3) NULL,
    `tbn` DECIMAL(8, 3) NULL,
    `tan` DECIMAL(8, 3) NULL,
    `gly` DECIMAL(8, 3) NULL,
    `water` DECIMAL(8, 3) NULL,
    `dilution` DECIMAL(8, 3) NULL,
    `lab_results_json` JSON NULL,
    `unit_no` VARCHAR(20) NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `sos_id_unit_id_mod_sample_date_idx`(`id_unit`, `id_mod`, `sample_date`),
    INDEX `sos_project_code_idx`(`project_code`),
    PRIMARY KEY (`id_sos`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspection` (
    `id_ins` INTEGER NOT NULL AUTO_INCREMENT,
    `id_unit` INTEGER NOT NULL,
    `id_mod` INTEGER NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `ins_date` DATE NOT NULL,
    `ins_hm` INTEGER NULL,
    `rating` VARCHAR(1) NOT NULL,
    `unit_no` VARCHAR(20) NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `inspection_id_unit_id_mod_type_idx`(`id_unit`, `id_mod`, `type`),
    INDEX `inspection_ins_date_idx`(`ins_date`),
    INDEX `inspection_project_code_idx`(`project_code`),
    PRIMARY KEY (`id_ins`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `condition` (
    `id_condition` INTEGER NOT NULL AUTO_INCREMENT,
    `id_unit` INTEGER NOT NULL,
    `id_mod` INTEGER NOT NULL,
    `condition` VARCHAR(20) NOT NULL,
    `sos_rating` VARCHAR(5) NULL,
    `fc_rating` VARCHAR(1) NULL,
    `mps_rating` VARCHAR(1) NULL,
    `vi_rating` VARCHAR(1) NULL,
    `ta2_rating` VARCHAR(1) NULL,
    `ed_rating` VARCHAR(1) NULL,
    `evaluated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unit_no` VARCHAR(20) NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `condition_project_code_idx`(`project_code`),
    INDEX `condition_condition_idx`(`condition`),
    UNIQUE INDEX `condition_id_unit_id_mod_key`(`id_unit`, `id_mod`),
    PRIMARY KEY (`id_condition`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ba` (
    `id_ba` INTEGER NOT NULL AUTO_INCREMENT,
    `no_ba` VARCHAR(20) NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,
    `posting_date` DATE NOT NULL,
    `symptom` TEXT NOT NULL,
    `failure` TEXT NOT NULL,
    `id_caused` INTEGER NOT NULL,
    `caused_other` VARCHAR(100) NOT NULL DEFAULT '',
    `id_status` INTEGER NOT NULL,
    `status_other` VARCHAR(100) NOT NULL DEFAULT '',
    `id_action` INTEGER NOT NULL,
    `mr_no` VARCHAR(30) NULL,
    `pr_no` VARCHAR(30) NULL,
    `po_no` VARCHAR(30) NULL,
    `status_ba` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `status_l1` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    `user_l1` VARCHAR(100) NULL,
    `status_l2` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    `user_l2` VARCHAR(100) NULL,
    `status_l3` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    `user_l3` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `ba_no_ba_key`(`no_ba`),
    INDEX `ba_project_code_idx`(`project_code`),
    INDEX `ba_status_ba_idx`(`status_ba`),
    INDEX `ba_status_l1_status_l2_status_l3_project_code_idx`(`status_l1`, `status_l2`, `status_l3`, `project_code`),
    PRIMARY KEY (`id_ba`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ba_approval` (
    `id_ba_approval` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ba` INTEGER NOT NULL,
    `level` VARCHAR(2) NOT NULL,
    `status` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `remark` TEXT NULL,

    INDEX `ba_approval_level_status_idx`(`level`, `status`),
    UNIQUE INDEX `ba_approval_id_ba_level_key`(`id_ba`, `level`),
    PRIMARY KEY (`id_ba_approval`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kanibal` (
    `id_kanibal` INTEGER NOT NULL AUTO_INCREMENT,
    `no_ba` VARCHAR(20) NOT NULL,
    `id_rep` INTEGER NULL,
    `id_unit` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `comp_desc` VARCHAR(100) NOT NULL,
    `pn` VARCHAR(100) NOT NULL DEFAULT '',
    `sn` VARCHAR(100) NOT NULL DEFAULT '',
    `pos` VARCHAR(100) NOT NULL DEFAULT '',
    `hm_comp` INTEGER NOT NULL DEFAULT 0,
    `wo_no_kanibal` VARCHAR(30) NULL,
    `wo_status_kanibal` VARCHAR(100) NOT NULL DEFAULT 'OPEN',
    `type` VARCHAR(10) NOT NULL,
    `unit_no` VARCHAR(20) NOT NULL,
    `snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `kanibal_no_ba_type_idx`(`no_ba`, `type`),
    INDEX `kanibal_id_unit_idx`(`id_unit`),
    PRIMARY KEY (`id_kanibal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ba_caused` (
    `id_caused` INTEGER NOT NULL AUTO_INCREMENT,
    `caused` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id_caused`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ba_action` (
    `id_action` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id_action`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ba_status` (
    `id_status` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id_status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id_user` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `level` VARCHAR(20) NOT NULL DEFAULT 'User',
    `project_code` VARCHAR(10) NULL,
    `sign` VARCHAR(5) NULL,
    `pcr_sign` VARCHAR(5) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_username_key`(`username`),
    INDEX `user_project_code_sign_idx`(`project_code`, `sign`),
    INDEX `user_project_code_pcr_sign_idx`(`project_code`, `pcr_sign`),
    PRIMARY KEY (`id_user`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `commod` ADD CONSTRAINT `commod_id_comp_fkey` FOREIGN KEY (`id_comp`) REFERENCES `comp`(`id_comp`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hm` ADD CONSTRAINT `hm_id_unit_fkey` FOREIGN KEY (`id_unit`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hm` ADD CONSTRAINT `hm_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replacement` ADD CONSTRAINT `replacement_id_mod_fkey` FOREIGN KEY (`id_mod`) REFERENCES `commod`(`id_mod`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replacement` ADD CONSTRAINT `replacement_id_unit_fkey` FOREIGN KEY (`id_unit`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replacement` ADD CONSTRAINT `replacement_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pcr_forecast` ADD CONSTRAINT `pcr_forecast_id_mod_fkey` FOREIGN KEY (`id_mod`) REFERENCES `commod`(`id_mod`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pcr_forecast` ADD CONSTRAINT `pcr_forecast_id_unit_fkey` FOREIGN KEY (`id_unit`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pcr_forecast` ADD CONSTRAINT `pcr_forecast_id_rep_fkey` FOREIGN KEY (`id_rep`) REFERENCES `replacement`(`id_rep`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pcr_forecast` ADD CONSTRAINT `pcr_forecast_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pcr_forecast` ADD CONSTRAINT `pcr_forecast_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pcr_forecast_approval` ADD CONSTRAINT `pcr_forecast_approval_id_forecast_fkey` FOREIGN KEY (`id_forecast`) REFERENCES `pcr_forecast`(`id_forecast`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pcr_forecast_approval` ADD CONSTRAINT `pcr_forecast_approval_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sos` ADD CONSTRAINT `sos_id_mod_fkey` FOREIGN KEY (`id_mod`) REFERENCES `commod`(`id_mod`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sos` ADD CONSTRAINT `sos_id_unit_fkey` FOREIGN KEY (`id_unit`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sos` ADD CONSTRAINT `sos_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_id_mod_fkey` FOREIGN KEY (`id_mod`) REFERENCES `commod`(`id_mod`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_id_unit_fkey` FOREIGN KEY (`id_unit`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `condition` ADD CONSTRAINT `condition_id_mod_fkey` FOREIGN KEY (`id_mod`) REFERENCES `commod`(`id_mod`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `condition` ADD CONSTRAINT `condition_id_unit_fkey` FOREIGN KEY (`id_unit`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ba` ADD CONSTRAINT `ba_id_caused_fkey` FOREIGN KEY (`id_caused`) REFERENCES `ba_caused`(`id_caused`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ba` ADD CONSTRAINT `ba_id_action_fkey` FOREIGN KEY (`id_action`) REFERENCES `ba_action`(`id_action`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ba` ADD CONSTRAINT `ba_id_status_fkey` FOREIGN KEY (`id_status`) REFERENCES `ba_status`(`id_status`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ba` ADD CONSTRAINT `ba_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ba_approval` ADD CONSTRAINT `ba_approval_id_ba_fkey` FOREIGN KEY (`id_ba`) REFERENCES `ba`(`id_ba`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ba_approval` ADD CONSTRAINT `ba_approval_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kanibal` ADD CONSTRAINT `kanibal_no_ba_fkey` FOREIGN KEY (`no_ba`) REFERENCES `ba`(`no_ba`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kanibal` ADD CONSTRAINT `kanibal_id_rep_fkey` FOREIGN KEY (`id_rep`) REFERENCES `replacement`(`id_rep`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kanibal` ADD CONSTRAINT `kanibal_id_unit_fkey` FOREIGN KEY (`id_unit`) REFERENCES `fleet_equipment_cache`(`fleet_equipment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
