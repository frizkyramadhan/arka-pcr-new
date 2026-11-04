-- SAP user chosen as OSCL.AssigneeCode. Nullable so rows saved before this still load.
ALTER TABLE `breakdowns`
  ADD COLUMN `assignee_user_id` INTEGER NULL,
  ADD COLUMN `assignee_name` VARCHAR(155) NULL;
