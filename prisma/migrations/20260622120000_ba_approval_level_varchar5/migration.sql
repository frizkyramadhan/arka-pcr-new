-- Widen ba_approval.level for PLM, OGM, etc.
ALTER TABLE `ba_approval` MODIFY COLUMN `level` VARCHAR(5) NOT NULL;

