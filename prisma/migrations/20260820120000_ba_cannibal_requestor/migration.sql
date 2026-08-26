-- Requestor (Cannibal Request By) + optional failure cause
ALTER TABLE `ba`
  ADD COLUMN `cannibal_request_role` VARCHAR(30) NULL AFTER `statement_confirmed_at`,
  ADD COLUMN `requested_by` INT NULL AFTER `cannibal_request_role`,
  ADD COLUMN `requested_confirmed_at` DATETIME(3) NULL AFTER `requested_by`,
  ADD COLUMN `requested_reject_remark` VARCHAR(2000) NULL AFTER `requested_confirmed_at`;

ALTER TABLE `ba`
  ADD CONSTRAINT `ba_requested_by_fkey`
    FOREIGN KEY (`requested_by`) REFERENCES `user`(`id_user`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional failure cause: column nullable + FK must allow SET NULL (Prisma default for Int?).
ALTER TABLE `ba` DROP FOREIGN KEY `ba_id_caused_fkey`;
ALTER TABLE `ba` MODIFY COLUMN `id_caused` INT NULL;
ALTER TABLE `ba` ADD CONSTRAINT `ba_id_caused_fkey` FOREIGN KEY (`id_caused`) REFERENCES `ba_caused`(`id_caused`) ON DELETE SET NULL ON UPDATE CASCADE;
