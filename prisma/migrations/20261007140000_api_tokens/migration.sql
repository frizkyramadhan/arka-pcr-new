-- API tokens for other applications (spec section 17 KPI API). Only the SHA-256 hash of the token is stored.

CREATE TABLE `api_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `token_prefix` VARCHAR(16) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `last_used_at` DATETIME(3) NULL,
    `last_used_ip` VARCHAR(45) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_tokens_token_hash_key`(`token_hash`),
    INDEX `api_tokens_user_idx`(`user_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `api_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `api_tokens_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id_user`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
