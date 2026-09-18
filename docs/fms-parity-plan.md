# Rencana Parity — FMS → arka-pcr-new

**Tujuan**: Logic, fungsi, dan UI **Fundamental Maintenance System (FMS)** dari arka-fms hadir di arka-pcr-new (path & shell PCR).

**Sumber**: `../arka-fms` — lihat juga plan Cursor `fms_parity_port` dan ADR [`docs/adr/0001-fms-parity-in-pcr.md`](adr/0001-fms-parity-in-pcr.md).

**Last updated**: 2026-09-17

## Keputusan mengikat

| ID | Keputusan |
|----|-----------|
| Bahasa | **FMS** (bukan MMS) |
| Path UI | `/maintenance-plans`, `/maintenance-actuals`, `/maintenance-types`, `/dashboards/maintenance` |
| Dashboard API | PCR → `/api/dashboard/pcr/*`; path lama = FMS |
| Unit | Satu tabel `fleet_equipment_cache`; actual FK `fleetUnitId` |
| Unit UI | `/units` + tab Maintenance di detail (parity FMS unit view) |
| Permission | FMS-style `maintenance-*.read|create|update|delete` → administrator (via system.admin), plant_foreman, plant_superintendent, plant_manager |
| Data | Migrasi dari DB FMS; sync Fleet dulu; `Number(unit_id)` |
| Attachment | Disk lokal `UPLOAD_DIR/attachments` + migrasi file dari FMS |

## Fase

0 Schema/RBAC/docs → 1 Dashboard namespace → 2 CRUD API → 3 Attachments → 4 Data migrate → 5 UI → 6 Nav/ACL → 7 Regression/docs

Implementasi mengikuti plan Cursor; dokumen ini ringkasan keputusan.
