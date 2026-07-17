-- Plant/Logistic justification, statement attestation, kanibal pair_index

ALTER TABLE `ba` ADD COLUMN `plant_p1_unit_rfu` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ba` ADD COLUMN `plant_production_req` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ba` ADD COLUMN `plant_other` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ba` ADD COLUMN `plant_other_text` VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE `ba` ADD COLUMN `logistic_no_stock` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ba` ADD COLUMN `logistic_lead_time` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ba` ADD COLUMN `logistic_other` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ba` ADD COLUMN `logistic_other_text` VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE `ba` ADD COLUMN `statement_requested_by` INTEGER NULL;
ALTER TABLE `ba` ADD COLUMN `statement_requested_at` DATETIME(3) NULL;
ALTER TABLE `ba` ADD COLUMN `statement_confirmed_by` INTEGER NULL;
ALTER TABLE `ba` ADD COLUMN `statement_confirmed_at` DATETIME(3) NULL;

ALTER TABLE `ba` ADD CONSTRAINT `ba_statement_requested_by_fkey` FOREIGN KEY (`statement_requested_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ba` ADD CONSTRAINT `ba_statement_confirmed_by_fkey` FOREIGN KEY (`statement_confirmed_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `kanibal` ADD COLUMN `pair_index` INTEGER NULL;
CREATE INDEX `kanibal_no_ba_pair_index_idx` ON `kanibal`(`no_ba`, `pair_index`);

-- Component status lookup: AS IS REPAIR (form label)
INSERT INTO `ba_status` (`id_status`, `status`)
SELECT 5, 'AS IS REPAIR'
WHERE NOT EXISTS (SELECT 1 FROM `ba_status` WHERE `status` = 'AS IS REPAIR');
