-- Cancelled breakdown stays in DB; excluded from open/dashboard/PA impact.
ALTER TABLE `breakdowns` ADD COLUMN `cancelled_at` DATETIME(3) NULL;

CREATE INDEX `breakdowns_cancelled_idx` ON `breakdowns`(`cancelled_at`);

-- STATUS WO: CANCEL for cancelled episodes (SAP WO cancelled or local-only cancel).
ALTER TABLE `breakdowns` MODIFY COLUMN `work_order_status` ENUM('OPEN', 'CLOSE', 'CANCEL') NOT NULL;
