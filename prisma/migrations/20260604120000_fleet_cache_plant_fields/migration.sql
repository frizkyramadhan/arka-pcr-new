-- Add plant_group and plant_type to fleet equipment cache (synced from ARKFleet)
ALTER TABLE `fleet_equipment_cache`
    ADD COLUMN `plant_group` VARCHAR(50) NULL AFTER `manufacture`,
    ADD COLUMN `plant_type` VARCHAR(50) NULL AFTER `plant_group`;
