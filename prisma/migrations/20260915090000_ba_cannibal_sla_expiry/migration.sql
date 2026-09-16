-- Cannibal BA SLA: 5×24h from plant submit; persist approval submit + expire snapshot.
ALTER TABLE `ba`
  ADD COLUMN `approval_submitted_at` DATETIME(3) NULL AFTER `plant_submitted_at`,
  ADD COLUMN `expired_at` DATETIME(3) NULL AFTER `approval_submitted_at`,
  ADD COLUMN `expired_from_status` VARCHAR(20) NULL AFTER `expired_at`;
