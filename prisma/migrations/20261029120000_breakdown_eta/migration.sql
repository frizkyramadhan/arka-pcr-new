-- ETA dates editable from the Summary Breakdown board (open BD rows).
ALTER TABLE `breakdowns`
  ADD COLUMN `eta_rfu_date` DATE NULL,
  ADD COLUMN `eta_rfu_if_part` DATE NULL;
