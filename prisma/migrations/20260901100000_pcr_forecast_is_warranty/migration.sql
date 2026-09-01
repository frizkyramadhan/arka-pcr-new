-- Warranty forecast flag — short BA approval chain PS → PM → PLM when true.
ALTER TABLE `pcr_forecast`
  ADD COLUMN `is_warranty` BOOLEAN NOT NULL DEFAULT false;
