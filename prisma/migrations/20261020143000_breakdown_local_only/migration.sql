-- Breakdown input is local-only for now; SAP identifiers are filled when WO sync is enabled.
ALTER TABLE `breakdowns`
  MODIFY `work_order` VARCHAR(30) NULL,
  MODIFY `sap_service_call_id` INTEGER NULL;

ALTER TABLE `breakdown_activities`
  MODIFY `sap_activity_code` INTEGER NULL;
