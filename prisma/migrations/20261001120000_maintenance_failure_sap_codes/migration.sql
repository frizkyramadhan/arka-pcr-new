-- Component, sub component, and damage codes copied from SAP when a finding is saved.
ALTER TABLE `maintenance_failures`
  ADD COLUMN `component_code` VARCHAR(50) NULL,
  ADD COLUMN `component_name` VARCHAR(100) NULL,
  ADD COLUMN `sub_component_code` VARCHAR(50) NULL,
  ADD COLUMN `sub_component_name` VARCHAR(100) NULL,
  ADD COLUMN `damage_code` VARCHAR(50) NULL,
  ADD COLUMN `damage_name` VARCHAR(100) NULL;
