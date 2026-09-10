-- Non-warranty PCR supply category + nested Repair fields. Null on warranty and legacy rows.
ALTER TABLE `pcr_forecast`
  ADD COLUMN `pcr_supply_category` VARCHAR(20) NULL,
  ADD COLUMN `repair_site` VARCHAR(20) NULL,
  ADD COLUMN `repair_vendor_kind` VARCHAR(20) NULL,
  ADD COLUMN `repair_dealer_name` VARCHAR(100) NULL,
  ADD COLUMN `repair_life_mode` VARCHAR(20) NULL;
