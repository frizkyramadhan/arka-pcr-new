-- Extend attachments.entity_type for inspection records (PCR).
ALTER TABLE `attachments`
  MODIFY `entity_type` ENUM('MAINTENANCE_PLAN', 'MAINTENANCE_ACTUAL', 'INSPECTION') NOT NULL;
