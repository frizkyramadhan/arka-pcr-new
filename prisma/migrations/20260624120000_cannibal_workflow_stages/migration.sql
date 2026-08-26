-- Cannibal BA staged workflow: plant → logistics → approval → documentation
ALTER TABLE `ba` MODIFY COLUMN `status_ba` VARCHAR(20) NOT NULL DEFAULT 'OPEN';

-- Do not use AFTER statement_confirmed_at: that column is added later in 20260630120000.
ALTER TABLE `ba`
  ADD COLUMN `plant_submitted_by` INT NULL AFTER `updated_at`,
  ADD COLUMN `plant_submitted_at` DATETIME(3) NULL AFTER `plant_submitted_by`,
  ADD COLUMN `execution_notes` TEXT NULL AFTER `plant_submitted_at`,
  ADD COLUMN `documentation_complete` BOOLEAN NOT NULL DEFAULT false AFTER `execution_notes`;

ALTER TABLE `ba`
  ADD CONSTRAINT `ba_plant_submitted_by_fkey`
    FOREIGN KEY (`plant_submitted_by`) REFERENCES `user`(`id_user`)
    ON DELETE SET NULL ON UPDATE CASCADE;
