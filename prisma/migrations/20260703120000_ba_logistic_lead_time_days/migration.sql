-- Lead Time Part: estimated total days (logistic statement)

ALTER TABLE `ba` ADD COLUMN `logistic_lead_time_days` INT NULL AFTER `logistic_lead_time`;
