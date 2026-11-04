-- ETA RFU IF PART SUPPLIED stores estimated days (not a calendar date).
UPDATE `breakdowns` SET `eta_rfu_if_part` = NULL;
ALTER TABLE `breakdowns`
  MODIFY COLUMN `eta_rfu_if_part` INT NULL;
