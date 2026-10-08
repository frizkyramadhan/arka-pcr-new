-- Units → Availability dihapus. PA dashboard dihitung dari jam kalender × unit aktif dikurangi downtime temuan.
-- DropForeignKey
ALTER TABLE `unit_availability_days` DROP FOREIGN KEY `unit_availability_days_fleet_equipment_id_fkey`;

-- DropTable
DROP TABLE `unit_availability_days`;
