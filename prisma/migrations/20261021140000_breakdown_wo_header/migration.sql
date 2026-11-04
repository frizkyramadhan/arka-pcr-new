-- Work-order header captured with a breakdown. Nullable so rows saved before this still load.
ALTER TABLE `breakdowns`
  ADD COLUMN `job_category` VARCHAR(8) NULL,
  ADD COLUMN `job_code` VARCHAR(8) NULL,
  ADD COLUMN `job_code_name` VARCHAR(100) NULL,
  ADD COLUMN `serial_no` VARCHAR(100) NULL,
  ADD COLUMN `location` VARCHAR(30) NULL,
  ADD COLUMN `operator_code` VARCHAR(30) NULL,
  ADD COLUMN `mechanic_leader_code` VARCHAR(30) NULL,
  ADD COLUMN `mechanic_leader_name` VARCHAR(100) NULL,
  ADD COLUMN `sub_component_code` VARCHAR(30) NULL,
  ADD COLUMN `sub_component_name` VARCHAR(100) NULL,
  ADD COLUMN `damage_code` VARCHAR(8) NULL,
  ADD COLUMN `damage_name` VARCHAR(100) NULL,
  ADD COLUMN `failure_cause_code` VARCHAR(30) NULL,
  ADD COLUMN `failure_cause_name` VARCHAR(100) NULL,
  ADD COLUMN `prepared_by` VARCHAR(20) NULL;
