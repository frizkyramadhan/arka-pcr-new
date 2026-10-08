-- Reason a plan row is still pending (Backlog drill-down, spec section 13), with who/when it was last set.
ALTER TABLE `maintenance_plan_details`
  ADD COLUMN `pending_reason` VARCHAR(500) NULL AFTER `plan_date`,
  ADD COLUMN `pending_reason_updated_at` DATETIME(3) NULL AFTER `pending_reason`,
  ADD COLUMN `pending_reason_updated_by` INT NULL AFTER `pending_reason_updated_at`;

ALTER TABLE `maintenance_plan_details`
  ADD CONSTRAINT `maintenance_plan_details_pending_reason_updated_by_fkey`
  FOREIGN KEY (`pending_reason_updated_by`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;
