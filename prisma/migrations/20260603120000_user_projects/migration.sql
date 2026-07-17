-- Multi-project data scope per user (project codes from Fleet API)
CREATE TABLE `user_project` (
    `id_user` INTEGER NOT NULL,
    `project_code` VARCHAR(10) NOT NULL,

    PRIMARY KEY (`id_user`, `project_code`),
    INDEX `user_project_project_code_idx`(`project_code`),
    CONSTRAINT `user_project_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `user`(`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill from legacy single project_code column
INSERT INTO `user_project` (`id_user`, `project_code`)
SELECT `id_user`, `project_code`
FROM `user`
WHERE `project_code` IS NOT NULL AND TRIM(`project_code`) <> '';
