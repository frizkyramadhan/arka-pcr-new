-- BA PCR rejection history — JSON array on existing ba_pcr row (no new table).
ALTER TABLE `ba_pcr` ADD COLUMN `rejection_history` JSON NULL;
