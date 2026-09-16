-- Location/lifetime/return-to on all non-warranty forecasts; oldcore class on replacement.
ALTER TABLE `pcr_forecast`
  ADD COLUMN `pcr_component_grade` VARCHAR(20) NULL,
  ADD COLUMN `pcr_return_to` VARCHAR(20) NULL,
  ADD COLUMN `return_other_fleet_unit_id` INT NULL,
  ADD COLUMN `cannibal_no_ba` VARCHAR(20) NULL;

ALTER TABLE `replacement`
  ADD COLUMN `oldcore_status` VARCHAR(20) NULL,
  ADD COLUMN `prediction_oldcore` VARCHAR(20) NULL;

-- Legacy RETURN life mode → Continue Life + Original Unit.
UPDATE `pcr_forecast`
SET
  `repair_life_mode` = 'CONTINUE_LIFE',
  `pcr_return_to` = COALESCE(`pcr_return_to`, 'ORIGINAL_UNIT')
WHERE `repair_life_mode` = 'RETURN';

ALTER TABLE `pcr_forecast`
  ADD INDEX `pcr_forecast_return_other_fleet_unit_id_idx` (`return_other_fleet_unit_id`),
  ADD INDEX `pcr_forecast_cannibal_no_ba_idx` (`cannibal_no_ba`);

ALTER TABLE `pcr_forecast`
  ADD CONSTRAINT `pcr_forecast_return_other_fleet_unit_id_fkey`
    FOREIGN KEY (`return_other_fleet_unit_id`) REFERENCES `fleet_equipment_cache` (`fleet_equipment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pcr_forecast_cannibal_no_ba_fkey`
    FOREIGN KEY (`cannibal_no_ba`) REFERENCES `ba` (`no_ba`) ON DELETE SET NULL ON UPDATE CASCADE;
