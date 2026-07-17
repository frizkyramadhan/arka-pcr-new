-- AlterTable: optional unique email on user (login still uses username)
ALTER TABLE `user` ADD COLUMN `email` VARCHAR(255) NULL;

CREATE UNIQUE INDEX `user_email_key` ON `user`(`email`);
