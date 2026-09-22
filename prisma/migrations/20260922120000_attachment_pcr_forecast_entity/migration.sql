-- Extend attachments.entity_type for PCR Forecast BA near-term attachments.
ALTER TABLE `attachments`
  MODIFY `entity_type` ENUM('MAINTENANCE_PLAN', 'MAINTENANCE_ACTUAL', 'INSPECTION', 'PCR_FORECAST') NOT NULL;
