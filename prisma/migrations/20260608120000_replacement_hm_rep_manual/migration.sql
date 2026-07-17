-- OPEN WO: hm_rep follows latest unit HM until user edits (hm_rep_manual = 1).
ALTER TABLE `replacement`
  ADD COLUMN `hm_rep_manual` TINYINT(1) NOT NULL DEFAULT 0 AFTER `hm_rep`;
