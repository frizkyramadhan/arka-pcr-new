# FMS parity in PCR — dashboard namespaces, single unit table, local attachments

PCR and FMS share one Next.js app. Dashboard API paths `/api/dashboard/stats` and `/achievement` belong to **FMS**; PCR dashboard clients use `/api/dashboard/pcr/*`. Maintenance Actual references `FleetUnitCache` (no separate FMS `units` table). Attachment files use local disk under `UPLOAD_DIR`, matching existing PCR replacement-report storage — not MinIO.

**Status**: accepted

**Considered Options**: dual Unit tables + dual-write; MinIO for FMS attachments; keep PCR on legacy dashboard paths.

**Consequences**: Migrating FMS data maps `unit_id` string → `fleetUnitId` Int after Fleet sync; UI unit list stays `/units` with an FMS tab on detail.
