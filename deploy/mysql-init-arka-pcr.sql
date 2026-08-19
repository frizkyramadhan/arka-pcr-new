-- =============================================================================
-- MySQL init — database + user untuk ARKA PCR (jalankan di container mysql)
-- =============================================================================
-- Contoh eksekusi dari host stack:
--   docker compose exec -T mysql mysql -uroot -p < deploy/mysql-init-arka-pcr.sql
--
-- GANTI password sebelum dijalankan di production.
-- Hostname koneksi dari app container: mysql (bukan localhost).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `arka_pcr_new`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Opsional: staging legacy dump untuk remigrasi cutover
CREATE DATABASE IF NOT EXISTS `arka_pcr_legacy`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'pcr_user'@'%' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

GRANT ALL PRIVILEGES ON `arka_pcr_new`.* TO 'pcr_user'@'%';
GRANT ALL PRIVILEGES ON `arka_pcr_legacy`.* TO 'pcr_user'@'%';

FLUSH PRIVILEGES;
