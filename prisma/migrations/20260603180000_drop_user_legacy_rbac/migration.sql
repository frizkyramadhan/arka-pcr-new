-- Backfill user_project from legacy user.project_code before dropping column
INSERT IGNORE INTO user_project (id_user, project_code)
SELECT id_user, project_code
FROM user
WHERE project_code IS NOT NULL AND TRIM(project_code) <> '';

-- Drop legacy access-control columns on user
DROP INDEX `user_project_code_sign_idx` ON `user`;
DROP INDEX `user_project_code_pcr_sign_idx` ON `user`;

ALTER TABLE `user`
  DROP COLUMN `level`,
  DROP COLUMN `project_code`,
  DROP COLUMN `sign`,
  DROP COLUMN `pcr_sign`;
