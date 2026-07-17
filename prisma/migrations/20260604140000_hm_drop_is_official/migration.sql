-- Remove is_official; add date_hm index for paginated list filters
ALTER TABLE `hm` DROP COLUMN `is_official`;

CREATE INDEX `hm_date_hm_idx` ON `hm` (`date_hm`);
