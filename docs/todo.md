**Purpose**: Track current work and immediate priorities for ARKA MMS (Maintenance Monitoring System)
**Last Updated**: 2026-08-20

## Working On Now

- `[WIP] P0: Packaging production Docker (Debian stack) — menunggu akses server + instruksi "deploy ke server" [Dockerfile; deploy/*; docs/deployment-docker-debian.md; docs/deployment-access-checklist.md]`

## Recently Completed (Cannibal Request By)

- `[done] P1: Request By jabatan (Rev 5) — kolom ba requestor, status PENDING_REQUESTOR, role production_superintendent, confirm/reject identity-gated, hide symptom/cause/RESEAL ONLY [lib/cannibal/requestor.ts; prisma/migrations/20260820120000_ba_cannibal_requestor]` (completed: 2026-08-20)
- `[done] P2: Create Cannibal BA jadi halaman /cannibals/create; Request By card di samping Plant Statement [CannibalPlantForm.js; pages/cannibals/create.js]` (completed: 2026-08-20)

## Recently Completed (Forecast UI)

- `[done] P3: Hapus kolom/tile RUL Estimate (AI) dari list forecast, detail forecast, dan riwayat replacement — tidak dipakai [forecastGridColumns.js; ForecastDetailSummary.js; replacements/[idMod]; build-snapshot.ts]` (completed: 2026-08-19)

## Recently Completed (Activity log)

- `[done] P1: Activity log setara Spatie laravel-activitylog — tabel activity_log, fluent logger, admin list, hook users/forecasts/cannibal/approvals [lib/activity-log/*; /admin/activity-logs; GET /api/admin/activity-logs]` (completed: 2026-08-13)
- `[done] P1: Activity log hook tambahan — cannibal plant/logistic/execution/planning + handoff logistics; replacement CRUD/close/reopen; SOS/inspection CRUD; hour meter CRUD + import summary; condition recompute [lib/*/service.ts]` (completed: 2026-08-13)

## Recently Completed (Email notifications)

- `[done] P2: Kurangi spam email — hapus due_overdue cron; PCR PS/PM projectScoped (+HO 000H); skip approval_decision saat fully_approved; dedupe key stabil [lib/notifications/*; registry; forecasts/cannibal service]` (completed: 2026-08-26)
- `[done] P2: Email events cannibal Request By — pending/confirmed/rejected (`cannibal_requestor_*`) selaras alur PENDING_REQUESTOR [lib/notifications/*; lib/cannibal/service.ts]` (completed: 2026-08-20)
- `[done] P2: Runtime toggle On/Off MAIL_ENABLED di /admin/email-notifications (persist data/runtime-settings.json, PATCH /api/admin/email-test) [lib/notifications/mail-enabled.ts]` (completed: 2026-08-13)
- `[done] P1: Email notifications via Nodemailer SMTP — approval forecast/cannibal + handoff logistics + admin trial page [lib/notifications/*; hooks di forecasts/cannibal service; /admin/email-notifications]` (completed: 2026-08-12)

## Recently Completed (Cannibal list)

- `[done] P3: Lebar kolom list forecast disamakan pola cannibal — flex ~0.75–1.5 + minWidth header [forecastGridColumns.js]` (completed: 2026-08-19)
- `[done] P3: Kolom Action list cannibal samakan dengan list forecast — dropdown TableRowActionSelect + lebar kolom mengisi card [cannibalGridColumns.js]` (completed: 2026-08-19)

## Recently Completed (Cannibal workflow)

- `[done] P1: Documentation sebelum approval — status PENDING_DOCUMENT; satu dialog Update Documentation (MR/PR/WO/notes); submit diblok tanpa MR/PR [lib/cannibal/types.ts; service.ts; CannibalExecutionDialog; header/list actions]` (completed: 2026-08-13)

## Recently Completed (Cannibal approval)

- `[done] P1: Cannibal PLM→PGM (Plant General Manager) + tukar urutan OGM sebelum PGM; migrasi DB [lib/approval/registry.ts; scripts/approval/migrate-cannibal-plm-to-pgm.ts]` (completed: 2026-08-06)
- `[done] P1: Tambah level President Director (PD) pada approval Cannibal — registry PS→…→OD→PD; role president_director; print box; backfill script [lib/approval/registry.ts; lib/rbac/role-templates.ts]` (completed: 2026-08-06)

## Recently Completed (Production packaging)

- `[done] P0: Dockerfile multi-stage + entrypoint migrate + compose/nginx/env/mysql init snippets untuk /home/skyone/stack [Dockerfile; docker/entrypoint.sh; deploy/; next.config output standalone]` (completed: 2026-07-17)

## In Progress

_(none)_

## Recently Completed (Cannibal Dashboard)

- `[done] P1: Dedicated Cannibal dashboard — /dashboard/cannibal; KPI pipeline; status mix; Ach by project×posting month; GET /api/dashboard/cannibal-stats + cannibal-achievement [lib/dashboard/cannibal-*.ts; src/views/pcr/dashboard/cannibal/*]` (completed: 2026-07-17)

## Recently Completed (AI RUL)

- `[done] P3: Kombinasi lead-time SAP (PR→PO) ke rekomendasi tanggal PR — "Rekomendasi mulai PR" di tile RUL Estimate, hanya jika sample >= 5 per compType [scripts/capture-sap-lead-time.ts; sap_lead_time_sample; lib/sap-b1/lead-time.ts; lib/calculations/rul.ts applyLeadTimeRecommendation; getForecastById]` (completed: 2026-07-16)

- `[done] P2: RUL by AI (regresi linear least-squares atas histori HM) sebagai info tambahan, tidak menggantikan Life %/Next Replacement Date [lib/calculations/rul.ts; pcr_forecast.rul_*; ForecastDetailSummary.js; forecastGridColumns.js; replacement detail page]` (completed: 2026-07-16)

## Recently Completed (Debug / admin cleanup)

- `[done] P3: Nonaktifkan debug forecast Delete All (tombol + API purge-all; fungsi service di-comment) [2026-08-12]`
- `[done] P3: Hapus SAP Integration admin (health check banner, halaman, script terjadwal, API health-status/reconciliation) — tabel log tetap di DB [2026-08-12]`

## Recently Completed (SAP B1 reliability)

- `[done] P1: Health check terjadwal + banner in-app admin [scripts/sap-health-check.ts; SapHealthCheckLog; GET /api/sap/health-status*; SapHealthBanner]` (completed: 2026-07-16)
- `[done] P2: TTL cache dokumen/chain SAP (45s) [lib/sap-b1/cache.ts]` (completed: 2026-07-16)
- `[done] P2: Kurangi N+1 chain-building (getMisForWo per WO, getPosForMr per MR) + test call-count [lib/sap-b1/documents-service.ts]` (completed: 2026-07-16)
- `[done] P1: Job rekonsiliasi status WO/PO SAP vs PCR (read-only) + halaman admin review [scripts/reconcile-sap-pcr-status.ts; SapReconciliationLog; /admin/sap-integration]` (completed: 2026-07-16)
- `[done] P2: Extend lookup P/N dengan on-hand qty (QuantityOnStock) [scripts/debug-sap-item-stock.ts; SapB1Material.onHand; SapMaterialAutocomplete]` (completed: 2026-07-16)
- `[done] P2: Dokumentasi arsitektur SAP B1 + ADR [docs/architecture.md; docs/decisions.md]` (completed: 2026-07-16)

## Recently Completed (Documentation)

- `[done] P2: User Manual ARKA PCR (Bahasa Indonesia + istilah English) — cover, TOC, glossary, alur PCR/Cannibal, matriks role, ~22 screenshot [docs/user-manual/ARKA-PCR-User-Manual.md; docs/user-manual/images/; scripts/capture-user-manual-screenshots.mjs]` (completed: 2026-07-15)

## Recently Completed (Auth)

- `[done] P2: Self-service change password from header user menu (above Sign Out) [POST /api/auth/change-password; ChangePasswordDialog; UserDropdown]` (completed: 2026-07-14)

## Recently Completed (Reports)

- `[done] P1: Remove Cannibal by Posting Periode report (page + API + service); keep Summary Cannibal only` (completed: 2026-07-14)

## Recently Completed (Dashboard PCR + Achievement)

- `[done] P1: Refactor /dashboard — KPI (incl. YTD Ach, Open WO), ApexCharts Ach trend + Kebutuhan/Close/Open, tabel Achievement PCR tahunan per proyek×bulan, year selector; GET /api/dashboard/achievement [lib/dashboard/achievement.ts; src/views/pcr/dashboard/*]` (completed: 2026-07-13)

- `[done] P1: Forecast by Price matrix + Model/Component filters independent of project on period & price reports [src/pages/reports/forecasts/price; useForecastMatrixFilters; listForecastPriceMatrix]` (completed: 2026-07-13)
- `[done] P1: Cannibal reports — summary list; menu Reports → Cannibal [src/pages/reports/cannibals]` (completed: 2026-07-13; period matrix removed 2026-07-14)
- `[done] P1: Forecast period matrix — count by Model×Component×Plan Periode; /reports/forecasts/period + API period-matrix [lib/forecasts/service.ts listForecastPeriodMatrix]` (completed: 2026-07-10)
- `[done] P1: PCR report — behavior selaras forecast (sticky Model/Unit/Component, header warna, filter rep month, BA PCR link, export) [src/pages/reports/pcr; reportGridColumns.js; lib/replacement/service.ts]` (completed: 2026-07-10)
- `[done] P1: Condition report — filter Project/Unit/Component/Evaluated/Overall/SOS; sort evaluatedAt desc + unitNo asc; kolom penuh dipertahankan [lib/condition/service.ts; src/pages/reports/conditions]` (completed: 2026-07-10)
- `[done] P1: Inspection report — kolom Project/Ins Date/Unit/Component/HM/Type/Rating; sort insDate desc + unitNo asc; filter date range [lib/inspection/service.ts; src/pages/reports/inspections]` (completed: 2026-07-10)
- `[done] P1: SOS report — kolom Project/Sample Date/Unit No/Component/Lab No/Evaluation Code; sort sampleDate desc + unitNo asc; filter date range + eval [lib/sos/service.ts; src/pages/reports/sos]` (completed: 2026-07-10)

## Recently Completed (Reports server-side refactor)

- `[done] P1: Reports summary tables — server-side search on key columns, full column set, shared ReportTableHeader + reportGridColumns [lib/utils/list-search.ts; src/hooks/useReportPage.js; src/views/pcr/reports/*; lib/*/service.ts search filter]` (completed: 2026-07-09)

## Recently Completed (SAP B1 document integration)

- `[done] P1: SAP B1 WO/MR/PR/PO lookup — documents-service, /api/sap/documents, SapDocumentBadge/Chain/Picker/DetailDrawer; integrated replacement + cannibal [lib/sap-b1/documents-service.ts; src/views/pcr/sap/*]` (completed: 2026-07-07)

## Recently Completed (SAP B1 P/N lookup)

- `[done] P1: SAP B1 Service Layer — lookup P/N cannibal [lib/sap-b1/*; GET /api/sap/materials; SapMaterialAutocomplete; npm run sap:ping]` (completed: 2026-07-02)

## Recently Completed (Cannibal form fidelity + schema)

- `[done] P1: Cannibal BA — Plant/Logistic justification, statement confirm, pair_index, form-fidelity UI [prisma Ba justification columns; lib/cannibal/pair-helpers.ts; CannibalDialog; confirm-statement API; npm run migrate:backfill-ba-justification]` (completed: 2026-06-30)

## Recently Completed (Multi BA PCR per forecast)

- `[done] P1: Resubmit BA PCR buat row ba_pcr baru + nomor baru; is_active; selector workflow di ForecastApprovalTimeline [migration 20260623140000; lib/forecasts/ba-pcr-helpers.ts; submitForecastBa; BaPcrHistoryList.js]` (completed: 2026-06-23)

## Recently Completed (BA PCR rejection history)

- `[done] P1: Riwayat reject BA PCR di ba_pcr.rejection_history (JSON) + tampilan di ForecastDetailInfo [migration 20260623120000; lib/forecasts/ba-pcr-rejection-history.ts; rejectForecastLevel append; BaPcrRejectionHistory.js]` (completed: 2026-06-23)

## Recently Completed (RBAC simplification)

- `[done] P1: RBAC 9 job roles + cannibal approval PS→PM→PLM→OGM→OD [lib/rbac/*; lib/cannibal/approval-workflow.ts; scripts/rbac/migrate-*]` (completed: 2026-06-22)

## Recently Completed (Hour Meters export/import)

- `[done] P1: Hour Meters export sesuai filter + import selaras format export [GET /api/exports/hour-meters; lib/hour-meter/excel.ts; upsert import by id_hm atau unit+date; HmTableHeader Export Excel + Template]` (completed: 2026-06-12)

## Recently Completed (PCR Forecast schema redesign)

- `[done] P0: Split ba_pcr dari pcr_forecast; procurement di replacement; close forecast via PO di WO [migration 20260619100000; lib/forecasts/service.ts; lib/forecasts/ba-pcr-number.ts]` (completed: 2026-06-19)

## Task Management Guidelines

### Entry Format

Each task entry must follow this format:
`[status] priority: task description [context] (completed: YYYY-MM-DD)`

### Context Information

Include relevant context in brackets to help with future AI-assisted coding:

- **Files**: `[app/api/plans/route.ts]` - specific file and line numbers
- **Functions**: `[createMaintenancePlan(), syncUnits()]` - relevant function names
- **APIs**: `[POST /api/plans, GET /api/units]` - API endpoints
- **Database**: `[maintenance_plans table, units.project_snapshot]` - tables/columns
- **Error Messages**: `["Hour meter validation failed"]` - exact errors
- **Dependencies**: `[blocked by unit sync API, needs MinIO setup]` - blockers

### Status Options

- `[ ]` - pending/not started
- `[WIP]` - work in progress
- `[blocked]` - blocked by dependency
- `[testing]` - testing in progress
- `[done]` - completed (add completion date)

### Priority Levels

- `P0` - Critical (app won't work without this)
- `P1` - Important (significantly impacts user experience)
- `P2` - Nice to have (improvements and polish)
- `P3` - Future (ideas for later)

---

# Current Tasks

## Working On Now

## Recently Completed (Fleet model cache + commod alignment)

- `[done] P1: fleet_model_cache + legacy_model_mapping; sync ARKFleet models; remap commod.id_model via mapping legacy ↔ ARKFleet [prisma/migrations/20260608100000_fleet_model_cache; lib/fleet-api/model-cache.ts; npm run migrate:backfill-models]` (completed: 2026-06-08)

## Recently Completed (Models page)

- `[done] P1: Halaman /models — fleet models + hubungan commod [GET /api/models, GET /api/models/[fleetModelId]/components; lib/models/service.ts; src/pages/models/index.js; sync ARKFleet; menu Units > Models]` (completed: 2026-06-08)

## Backlog pointer

- _(RBAC fase 1–5 selesai; lihat `docs/rbac-migration-draft.md`)_

## Recently Completed (Legacy data migration — staging)

- `[done] P1: Migrasi data legacy db_arka_pcr.sql → arka_pcr_new (tanpa user) [LEGACY_DATABASE_URL=arka_pcr; 531 unit mapping; HM 243944; replacement 12521; SOS 8882; BA 2495; kanibal 3653; docs/legacy-data-migration-plan.md]` (completed: 2026-06-04)

## Recently Completed (User CRUD + permissions)

- `[done] P1: RBAC migration — ganti level/sign/pcr_sign/project_code [lib/rbac/*; prisma/migrations/20260603180000_drop_user_legacy_rbac; src/hooks/useCan.js; API requirePermission; docs/rbac-migration-draft.md fase 1–4]` (completed: 2026-06-03)

- `[done] P2: Roles & Permissions UI selaras Users (TableHeader + DataGrid + drawer) [src/pages/roles/index.js, src/pages/permissions/index.js; AddRoleDrawer dengan PermissionCheckboxGroups per modul; src/utils/permission-groups.js]` (completed: 2026-06-03)

- `[done] P1: Integrasi Fleet API via env terpisah project + unit dan manual sync di /units [PROJECTS_API_URL & ARK_FLEET_UNITS_URL dipakai di lib/fleet-api/fetch.ts; endpoint alias /api/fleet/units* ditambahkan; tombol SYNC TO ARKFLEET memanggil POST /api/fleet/sync]` (completed: 2026-06-02)
- `[done] P1: Refactor internal naming equipment -> unit untuk Fleet cache stack [prisma/schema.prisma: FleetUnitCache + fleetUnitId + relation unit dengan @map kompatibel; lib/src internal rename; API boundary tetap kompatibel via fallback fleetEquipmentId; route contract /fleet/equipments dan /equipments dipertahankan]` (completed: 2026-06-02)

- `[done] P2: Perluas dokumentasi apps-overview untuk domain Unit & Project, User, Role, Permission [alur data, struktur model, behavior endpoint, aturan akses ACL]` (completed: 2026-06-02)
- `[done] P2: Buat dokumentasi komprehensif semua apps ARKA MMS [docs/apps-overview.md; mencakup pages route, API endpoint, navigasi, auth, dashboard, modul pendukung]` (completed: 2026-06-02)
- `[done] P2: Sesuaikan CRUD apps/user dengan permission user.read, user.create, user.update, user.delete — API GET/POST requirePermission; [id] GET/PATCH/DELETE per permission; list page tombol Add & aksi Edit/Delete pakai AbilityContext]` (completed: 2026-03-13)

## Recently Completed (API auth refactor)

- `[done] P2: Refactor src/pages/api/auth/* — src/lib/auth-api.js (JWT, cookie, mapUserData, signAccessToken); logout clear cookie dengan Secure di prod; me parseBearer + cek decoded.id; register mapRegisteredUser + blank line ESLint]` (completed: 2026-03-11)

## Recently Completed (User email & registration)

- `[done] P2: User email nullable + public register [prisma User.email; POST /api/auth/register isActive false; login username/password; register form fullName/username/email/password; admin activation notice]` (completed: 2026-06-03)

## Recently Completed (Nav & Pages cleanup)

- `[done] P2: Bersihkan menu navigasi dari demo Vuexy [src/navigation/menuConfig.js hanya modul PCR; Administration Users/Roles/Permissions; getHomeRoute ke /dashboards/maintenance; shortcut app bar PCR]` (completed: 2026-06-03)
- `[done] P2: Hapus halaman selain Dashboard Maintenance, Plan, Actual, Type, Unit, User, Role, Permission; navigasi vertikal & horizontal hanya menu ARKA MMS; server-side menu (fake-db) dan app-bar search disesuaikan; UserDropdown hanya Dashboard + Sign Out; index redirect ke /dashboards/maintenance; getHomeRoute selalu ke maintenance]` (completed: 2026-03-09)

## Recently Completed (Role & Permission)

- `[done] P2: Role & Permission ala Spatie [Prisma: permissions, roles, role_permissions, user_roles; seed permissions + role-permission mapping + user_roles dari User.role; src/lib/permissions.js getPermissionsForUser, buildAbilityFromPermissions, getAbilityForUser; /api/auth/me & login kembalikan userData.permissions; acl.js buildAbilityFor(user) dari permissions; AclGuard pakai buildAbilityFor(auth.user); middleware tetap role-based]` (completed: 2026-03-06)

## Recently Completed

- `[done] P2: Grafik Achievement per Site (grid PLAN/ACTUAL/ACH) [Tab "Grafik per Site"; AchievementChartsGrid.js — satu chart per Maintenance Type × Site, filter Project/Tahun/Bulan; dual Y-axis, ACH 2 desimal, tooltip, responsive]` (completed: 2026-03-03)
- `[done] P2: Dashboard Maintenance + Achievement table [Route/nav mms→maintenance; GET /api/dashboard/achievement?year=; tabel PLAN/ACTUAL/ACH per site & program CBM, All Program & All Site Ach; pilih tahun]` (completed: 2026-03-03)
- `[done] P2: Dashboard widgets (Total Unit, Due This Month, Compliance, Overdue) [GET /api/dashboard/stats, src/pages/dashboards/maintenance, nav + home → /dashboards/maintenance]` (completed: 2026-03-03)
- `[done] P1: Access control user berdasarkan role [Next.js Middleware (src/middleware.js) + ACL; role di JWT + cookie HttpOnly; /apps/user/* hanya ADMIN_HO; nav subject user-list; API users require ADMIN_HO; POST /api/auth/logout]` (completed: 2026-03-03)
- `[done] P1: Attachment upload via JSON+base64 [POST /api/attachments/upload body JSON, max 3MB/file, 4MB body; view [id].js baca file→base64, satu request per file; menghindari ERR_CONNECTION_ABORTED multipart]` (completed: 2026-02-25)
- `[done] P1: Halaman detail Maintenance Actual [src/pages/apps/maintenance-actual/view/[id].js, GET /api/maintenance-actuals/[id], tampil plan/unit/date/time/hour meter/remarks/mechanics/created by; tombol View di list, link unit ke unit view]` (completed: 2026-02-26)
- `[done] P1: CRUD Maintenance Actual [maintenance_actuals: maintenancePlanId, unitId, maintenanceDate, maintenanceTime?, hourMeter, remarks?, mechanics?, createdById; GET/POST /api/maintenance-actuals, GET/PATCH/DELETE /api/maintenance-actuals/[id], list + filter (Plan, Unit, Date range) + Add/Edit drawer + delete toast confirm, nav Maintenance Actuals]` (completed: 2026-02-26)
- `[done] P1: Maintenance Plan export/import Excel [xlsx; Export dari list → maintenance-plans-YYYYMMDD.xlsx kolom: id, project_id, year, month, maintenance_type_id, maintenance_type_name, sum_plan; Import: POST /api/maintenance-plans/import { plans, createdById } → create/update by id, toast created/updated/errors]` (completed: 2026-02-26)
- `[done] P1: CRUD Maintenance Plan [maintenance_plans: projectId, year, month, maintenanceTypeId, sumPlan, createdById; GET/POST /api/maintenance-plans, GET/PATCH/DELETE /api/maintenance-plans/[id], list + Add/Edit drawer + toast delete confirm, nav]` (completed: 2026-02-26)
- `[done] P1: CRUD Maintenance Type — list, add, edit, delete [GET/POST /api/maintenance-types, GET/PATCH/DELETE /api/maintenance-types/[id], src/pages/apps/maintenance-type/list, store apps/maintenanceType, nav]` (completed: 2026-02-25)
- `[done] P1: Register page — register-v1 layout, only username/email/password; role default ADMIN_HO, status inactive [POST /api/auth/register, src/pages/register/index.js, authConfig.registerEndpoint]` (completed: 2026-02-25)
- `[done] P1: Unit sync from external API [GET /api/units, POST /api/units/sync, src/configs/arkFleetApi.js, ark-fleet equipments → units upsert]` (completed: 2026-02-23)
- `[done] P1: CRUD User (ulang) — template Vuexy + Next.js API + Prisma [src/pages/api/users, src/pages/apps/user/list, AddUserDrawer, EditUserDrawer, store apps/user]` (completed: 2026-02-23)
- `[done] P0: Set up MySQL + Prisma schema & koneksi ke database [prisma/schema.prisma, .env DATABASE_URL, db push, db:seed maintenance_types]` (completed: 2026-02-23)

## Up Next (Implementation Phase)

- `[done] P0: Initialize Next.js project with App Router [create-next-app, TypeScript]` (completed: 2026-02-19)
- `[done] P0: Set up MySQL + Prisma schema [prisma/schema.prisma, docs/maintenance-monitoring-system.md §5]` (completed: 2026-02-23)
- `[done] P0: Implement authentication & role-based access (ADMIN_HO, ADMIN_SITE, MECHANIC) [NextAuth/Auth.js]` (completed: 2026-02-19)
- `[done] P1: CRUD User [users table, API + halaman + nav, hanya ADMIN_HO]` (completed: 2026-02-19)
- `[done] P1: Unit sync from external API [GET /api/units, POST /api/units/sync]`
- `[done] P1: Maintenance Plan CRUD [maintenance_plans]` (completed: 2026-02-26)
- `[done] P1: Maintenance Actual CRUD [maintenance_actuals; mechanics = text field]` (completed: 2026-02-26)
- `[done] P2: Dashboard widgets (Total Unit, Due This Month, Compliance, Overdue) [§9]`
- `[ ] P2: Scheduler (MISSED status, unit sync) [Worker Node / cron]`

## Blocked/Waiting

- None currently

## Recently Completed

- `[done] P1: CRUD User [API GET/POST /api/users, GET/PATCH/DELETE /api/users/[id], halaman list/new/edit, nav Pengguna untuk ADMIN_HO]` (completed: 2026-02-19)
- `[done] P0: Implement authentication & role-based access [NextAuth v5, Credentials, JWT, role in session, /login, /dashboard, middleware]` (completed: 2026-02-19)
- `[done] P0: Set up MySQL + Prisma schema [prisma/schema.prisma, all models per design §5]` (completed: 2026-02-19)
- `[done] P0: Align project documentation with maintenance-monitoring-system.md [AGENTS.md, docs/architecture.md, docs/todo.md, docs/backlog.md]` (completed: 2026-02-19)

## Quick Notes

### Domain Reference

- **Design spec**: `docs/maintenance-monitoring-system.md`
- **Architecture**: `docs/architecture.md`

### Maintenance Types

Inspection, Washing, Greasing, Track Cleaning, PPU/CTS

### Plan Status

OPEN → DONE (when actual linked) | OPEN → MISSED (when past date without actual)

### CRUD User (implementasi saat ini — Pages Router + Vuexy)

1. **API routes** — `src/pages/api/users/index.js` (GET list, POST create), `src/pages/api/users/[id].js` (GET, PATCH, DELETE). Validasi di handler, hash password (bcryptjs) saat create/update.
2. **Store** — `src/store/apps/user/index.js`: fetchData → GET /api/users, addUser → POST /api/users, updateUser → PATCH /api/users/[id], deleteUser → DELETE /api/users/[id].
3. **Halaman list** — `src/pages/apps/user/list/index.js`: DataGrid (username, name, email, role, projectScope, isActive), filter role & status, Tambah/Edit drawer.
4. **Drawer** — `AddUserDrawer.js` (username, name, email, password, role, projectScope, isActive), `EditUserDrawer.js` (load by id, PATCH; password opsional).
5. **Navigasi** — Menu "User" → "List" ke `/apps/user/list` (Vuexy vertical nav). Restrict ke ADMIN_HO bisa ditambah via ACL/guard.

### Unit sync (ark-fleet → units table)

1. **Endpoint eksternal** — `http://192.168.32.15/ark-fleet/api/units` (config: `ARK_FLEET_UNITS_URL` di `.env`).
2. **GET /api/units** — List unit dari DB (query: `q` search code/model/projectName, `project` filter by projectId/projectName).
3. **POST /api/units/sync** — Fetch data unit dari ark-fleet, upsert ke `units` (id, code=unit_no, model, projectId=project_id, projectName=project_code, lastSyncAt). Response: `{ ok, synced, created, updated }`.
4. **Mapping** — Satu item unit: id→id, unit_no→code, model→model, project_id→projectId, project_code→projectName.

### Business Rules

- Hour meter must not be less than previous history
- Actual linked to plan → plan status becomes DONE
- Attachment: optional, multi file, cascade delete

### Documentation Maintenance

After every significant code change:

1. Update `docs/architecture.md` with current state
2. Update progress in `docs/todo.md`
3. Log decisions in `docs/decisions.md`
4. Note important discoveries in `MEMORY.md`
5. Move future ideas to `docs/backlog.md`
