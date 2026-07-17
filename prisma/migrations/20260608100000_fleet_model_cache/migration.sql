-- Fleet model master cache + legacy model mapping; commod FK to fleet_model_cache

CREATE TABLE `fleet_model_cache` (
    `fleet_model_id` INTEGER NOT NULL,
    `model_name` VARCHAR(50) NULL,
    `manufacture` VARCHAR(50) NULL,
    `plant_group` VARCHAR(50) NULL,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`fleet_model_id`),
    INDEX `fleet_model_cache_model_name_idx`(`model_name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed from existing unit cache before FK constraints
INSERT INTO `fleet_model_cache` (`fleet_model_id`, `model_name`, `manufacture`, `plant_group`, `synced_at`)
SELECT
    `fleet_model_id`,
    MAX(`model_name`),
    MAX(`manufacture`),
    MAX(`plant_group`),
    NOW(3)
FROM `fleet_equipment_cache`
GROUP BY `fleet_model_id`;

-- Commod-only models (if any) not present on units
INSERT IGNORE INTO `fleet_model_cache` (`fleet_model_id`, `model_name`, `synced_at`)
SELECT DISTINCT `id_model`, CONCAT('Legacy model ', `id_model`), NOW(3)
FROM `commod`
WHERE `id_model` NOT IN (SELECT `fleet_model_id` FROM `fleet_model_cache`);

CREATE TABLE `legacy_model_mapping` (
    `legacy_model_id` INTEGER NOT NULL,
    `fleet_model_id` INTEGER NOT NULL,
    `legacy_model_no` VARCHAR(50) NULL,
    `legacy_manufacture` VARCHAR(50) NULL,
    `mapped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`legacy_model_id`),
    INDEX `legacy_model_mapping_fleet_model_id_idx`(`fleet_model_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `fleet_equipment_cache`
    ADD CONSTRAINT `fleet_equipment_cache_fleet_model_id_fkey`
    FOREIGN KEY (`fleet_model_id`) REFERENCES `fleet_model_cache`(`fleet_model_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `legacy_model_mapping`
    ADD CONSTRAINT `legacy_model_mapping_fleet_model_id_fkey`
    FOREIGN KEY (`fleet_model_id`) REFERENCES `fleet_model_cache`(`fleet_model_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `commod`
    ADD CONSTRAINT `commod_id_model_fkey`
    FOREIGN KEY (`id_model`) REFERENCES `fleet_model_cache`(`fleet_model_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
