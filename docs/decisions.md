**Purpose**: Record technical decisions and rationale for future reference
**Last Updated**: 2026-09-01

# Technical Decision Records - ARKA MMS

> **Proyek**: Maintenance Monitoring System. Lihat `docs/maintenance-monitoring-system.md` untuk desain sistem.

## Decision Template

Decision: [Title] - [YYYY-MM-DD]

**Context**: [What situation led to this decision?]

**Options Considered**:

1. **Option A**: [Description]
   - ✅ Pros: [Benefits]
   - ❌ Cons: [Drawbacks]
2. **Option B**: [Description]
   - ✅ Pros: [Benefits]
   - ❌ Cons: [Drawbacks]

**Decision**: [What we chose]

**Rationale**: [Why we chose this option]

**Implementation**: [How this affects the codebase]

**Review Date**: [When to revisit this decision]

---

## Recent Decisions

### Decision: Warranty Forecast BA chain PS→PM→PLM — 2026-09-01

**Context**: Komponen masih di bawah policy (`lifePercent < 100`) sering diganti via claim warranty. BA PCR biasa menunggu 6 level sampai Direksi; untuk warranty, approval cukup sampai Plant Manager.

**Options Considered**:

1. **Option A**: Flag `pcr_forecast.is_warranty` + rantai pendek PS → PM → PLM; Fully Approved setelah PLM; BA label “Pergantian Warranty”
   - ✅ Pros: satu entitas forecast, engine approval reuse, permission existing
   - ❌ Cons: dua rantai harus di-resolve di seed/fullyApproved/notify/UI
2. **Option B**: Modul/menu Warranty terpisah + field warranty HM khusus
   - ✅ Pros: isolasi fitur
   - ❌ Cons: duplikasi alur BA/forecast; out of scope v1

**Decision**: Option A.

**Rationale**: Eligibility jelas (under policy); dual button create; print/UI cukup label. Close WO: warranty tanpa MR/PR/PO; normal wajib MR/PR/PO + oldcore; installation report hanya MAJOR (`lib/replacement/close-requirements.ts`, 2026-09-01).

**Implementation**:
- Schema: `PcrForecast.isWarranty` (`is_warranty`)
- Registry: `PCR_FORECAST_WARRANTY_APPROVAL_CHAIN` + `getForecastApprovalChain(isWarranty)`
- Create validates under policy when `isWarranty`; submit BA seeds short chain
- UI: dual create buttons, Warranty chip, timeline/print trim Direksi

**Review Date**: 2026-12-01 (filter monitor Warranty / warrantyHm terpisah)

---

### Decision: BA Kanibal Request By jabatan (form Rev 5) — grilling 2026-08-20

**Context**: Form kertas punya CANNIBAL REQUEST BY (Supt. Production / PJO / GM Operation / GM Plant) lalu TTD REQUEST BY. App baru menaruh REQUEST BY sebagai `statementRequestedBy` dengan label Foreman/Supervisor Plant. `user.sign` sudah tidak ada; jabatan = role RBAC.

**Decision**:
1. Plant Statement dan Logistic Statement tetap **pilih satu** (sudah radio di UI).
2. Request By jabatan **pilih satu**; TTD adalah **user yang memegang jabatan itu**.
3. **PJO = Project Manager** → role `project_manager`.
4. **Supt. Production terpisah** dari `plant_superintendent` (PS approver). Perlu role requester baru, tidak masuk rantai approval.
5. **GM Operation = `operational_gm` (OGM).** Pool user yang sama untuk Request By dan approval.
6. **GM Plant = `plant_manager` (PGM).** Pool user yang sama untuk Request By dan approval.
7. **Creator ≠ Requestor.** Pembuat BA tetap user plant (`createdBy`). Requestor = jabatan terpilih + user jabatan itu pada kolom baru (`cannibal_request_role`, `requested_by`). Jangan reuse `statementRequestedBy`.
8. Role baru **`production_superintendent`**.
9. Setiap requestor terpilih **wajib konfirmasi di sistem** (mirip approval: confirm/reject), bukan hanya tercetak nama.
10. Urutan: **Plant → konfirmasi requestor (`PENDING_REQUESTOR`) → Logistics → Documentation → PS–PD**. Hanya user `requested_by` yang boleh act.
11. **Reject requestor → kembali ke Plant** sebagai acuan **naikkan order P1**. Plant **boleh edit** (plant statement, dll.) dan **submit ulang** BA yang sama. Bukan auto-cancel, bukan arsip-only.
12. **Submit ulang selalu ke `PENDING_REQUESTOR` lagi.** Requestor boleh diganti; konfirmasi lama di-reset.
13. **Symptom dan Failure Cause tidak ditampilkan di UI baru** dan tidak wajib. Kolom tetap untuk data lama.
14. **RESEAL ONLY disembunyikan di form baru.** Baris `ba_status` tidak dihapus (BA lama).

**Implementation**: Done 2026-08-20. Kolom `ba.cannibal_request_role`, `requested_by`, `requested_confirmed_at`, `requested_reject_remark`; `id_caused` nullable. Status `PENDING_REQUESTOR` di antara Plant dan Logistics. Role `production_superintendent` (`cannibals.access` only). Confirm/reject identity-gated ke `requested_by`. Print REQUEST BY memakai requestor, bukan `statementRequestedBy`. Symptom / Failure Cause / RESEAL ONLY disembunyikan di form & print baru. Seed: `npm run rbac:seed`.

**Review Date**: 2026-09-20

---


### Decision: Activity log setara Spatie laravel-activitylog - 2026-08-13

**Context**: Perlu audit trail siapa melakukan apa pada forecast, cannibal, user, dan approval. Spatie `laravel-activitylog` adalah referensi (subject/causer morphs, properties, attribute_changes). Prisma tidak punya Eloquent observers.

**Options Considered**:

1. **Explicit logger di service** (dipilih)
   - ✅ Pola Spatie `activity()->causedBy()->performedOn()->log()`
   - ✅ Fail-soft, tidak mengandalkan magic Prisma middleware
   - ❌ Harus di-hook per aksi (bukan auto semua model)
2. **Prisma `$use` middleware**
   - ✅ Otomatis semua CRUD
   - ❌ Noise (lastLogin, snapshot refresh), sulit filter field, tidak ada description bisnis

**Decision**: Tabel `activity_log` + fluent `activity()` / `logActivity()`. Hook eksplisit di users, forecasts, cannibal (termasuk plant/logistic/execution + handoff), approvals, replacement, SOS, inspection, hour meter, condition recompute. Admin page `system.admin`.

**Implementation**: `lib/activity-log/*`; `GET /api/admin/activity-logs`; `/admin/activity-logs`; `npm run activitylog:clean`.

**Review Date**: 2026-11-13

---

**Context**: Outbound email for approval workflows, logistics handoff, admin trial. Resend tried first; corporate SMTP preferred for `@arka.co.id`. Cron due/overdue dihapus 2026-08-26 (spam risk broadcast harian).

**Decision**: Nodemailer with generic SMTP env (`SMTP_HOST`, `SMTP_PORT`, etc.), fail-soft delivery, audit in `notification_log`, admin trial at `/admin/email-notifications`. Workflow-only events (no daily digest cron).

**Implementation**: `lib/notifications/mailer.ts`; hooks unchanged in forecast/cannibal services. Admin runtime toggle `MAIL_ENABLED` via `PATCH /api/admin/email-test` + `data/runtime-settings.json` (override env tanpa restart).

**Review Date**: 2026-11-01

---

### Decision: Production deploy ARKA PCR ke Docker Compose Debian (`/home/skyone/stack`) - 2026-07-17

**Context**: Production target adalah server Debian dengan Docker Compose bersama (nginx, mysql, php74/81/82, appnet). ARKA PCR adalah Next.js + Prisma, bukan Laravel PHP.

**Decision**:
1. Deploy sebagai service Node terpisah `arka-pcr` di `apps/app81/arka-pcr` (pola seperti `arka-fms`).
2. Multi-stage Dockerfile: `deps` → `builder` → `tools` (ops) → `runner` (standalone Next.js).
3. DB via hostname `mysql` di `appnet`; Nginx reverse proxy; volume `uploads`.
4. `prisma migrate deploy` di entrypoint; seed/fleet/legacy migration via Compose profile `tools`.
5. Remigrasi data legacy penuh saat cutover (legacy masih write sampai freeze).

**Rationale**: Tidak mengubah PHP stack; selaras infrastruktur existing; image runner ramping; tools image untuk skrip `tsx`.

**Implementation**: `Dockerfile`, `docker/entrypoint.sh`, `deploy/*`, `docs/deployment-docker-debian.md`, `docs/deployment-access-checklist.md`, `output: 'standalone'` di `next.config.js`.

**Review Date**: 2026-10-17

---

### Decision: SAP B1 integration tetap read-only lookup + reliability improvements - 2026-07-16

**Context**: Integrasi SAP B1 (P/N lookup, dokumen WO/MR/PR/PO/MI) sudah live sejak awal Juli 2026 tapi punya risiko operasional: tidak ada monitoring saat SAP down, chain-building WO→MR→PR→PO→MI melakukan banyak GET N+1, tidak ada deteksi selisih status SAP vs PCR, dan session store SAP hanya in-memory per proses.

**Options Considered**:

1. **Session store terpusat (Redis/DB) untuk multi-instance SAP session** — Pros: siap horizontal scale; Cons: kompleksitas + dependency baru, deployment saat ini single Node process (Windows/XAMPP), tidak relevan sekarang.
2. **SAP jadi source-of-truth, PCR menulis balik status** — Pros: selalu sinkron; Cons: risiko tinggi menulis ke sistem produksi pihak lain, di luar scope PCR sebagai monitoring tool.
3. **Tetap read-only lookup, tambah reliability layer (health check, cache, kurangi N+1, job rekonsiliasi read-only, extend field stok)** — Pros: risiko rendah, tidak mengubah kontrak SAP, cepat memberi visibility ke admin; Cons: tidak menghilangkan celah data selama window antar-check.

**Decision**: Pilih opsi 3. SAP B1 tetap read-only lookup. Tambah: (1) health check terjadwal + banner in-app admin, (2) TTL cache 45s untuk dokumen/chain, (3) kurangi N+1 pada chain-building (hoist `getMisForWo`/`getPosForMr` ke level lane/MR), (4) job rekonsiliasi harian read-only (deteksi selisih, tidak menulis ke SAP), (5) extend lookup P/N dengan on-hand qty (`QuantityOnStock`). Session store terpusat (#4 pada rencana awal) **ditunda** — revisit jika deployment jadi multi-instance.

**Rationale**: Semua perbaikan bisa diterapkan tanpa mengubah kontrak/write access ke SAP, cocok dengan skala deployment saat ini (single Node process), dan memberi visibility operasional (admin tahu SAP down / status tidak sinkron) tanpa menambah risiko menulis ke sistem SAP produksi.

**Implementation**: `lib/sap-b1/cache.ts`; refactor `lib/sap-b1/documents-service.ts` (`buildLaneForWo`, `buildPathsForMr`, `getMisForMr`); `scripts/debug-sap-item-stock.ts` (verifikasi field) + `SapB1Material.onHand`. Migration `20260715160000_sap_reliability_logs_and_forecast_rul` (tabel log health/reconcile — UI & script terjadwal dihapus 2026-08-12).

**Review Date**: 2026-10-16

---

### Decision: Cannibal BA — Plant/Logistic justification schema + logistic confirm gate - 2026-06-30

**Context**: Form kertas BERITA ACARA KANIBAL punya section Plant Statement + Logistic Statement (min 1 per kolom) dan tanda tangan Request By / Confirmed By Logistic terpisah dari approval chain PS→OD. Skema legacy `ba_caused` hanya failure taxonomy; tidak ada kolom justification.

**Decision**: Perluas `ba` dengan boolean Plant/Logistic + `statement_requested_by/at` + `statement_confirmed_by/at`. Tambah `kanibal.pair_index` untuk pairing REMOVE/INSTALL. Submit ke approval wajib logistic statement dulu (`cannibals.update.logistic`).

**Rationale**: Form fidelity tanpa mengubah semantik `ba_caused` legacy; konfirmasi logistic = gate operasional sebelum approval manajemen.

**Implementation**: Migration `20260630120000_ba_justification_statement_pairs`, `lib/cannibal/pair-helpers.ts`, `lib/validations/cannibal.ts` (pairs payload), `POST /api/cannibal/[id]/confirm-statement`, UI refactor `CannibalDialog` + detail/print.

**Review Date**: 2026-09-30

---

### Decision: RBAC simplification — 9 job roles + cannibal 5-level approval - 2026-06-22

**Context**: Role teknis (`planner_pf`, `cannibal_l1`, `super_user`, …) dan permission L1/L2/L3 sulit dipahami admin dan tidak selaras jabatan organisasi ARKA.

**Decision**: Ganti seed template menjadi 9 role jabatan. Cannibal BA approval: PS → PM → PLM → OGM → OD (permission `cannibals.approve.*`). Forecast label: PS = Superintendent, FD = Commercial & Treasury Director. Hapus `system.super` dari katalog aktif.

**Rationale**: Satu role = satu jabatan; kode approval cannibal selaras forecast (PS, PM, PLM, OD) + OGM khusus cannibal.

**Implementation**: `lib/rbac/role-templates.ts`, `lib/rbac/permission-catalog.ts`, `lib/cannibal/approval-workflow.ts`, scripts `rbac:migrate-job-roles`, `rbac:migrate-cannibal-approvals`. Legacy roles/permissions soft-deactivated.

**Review Date**: 2026-09-22

---

### Decision: Migrasi otorisasi User — RBAC menggantikan level / sign / pcr_sign / project_code - 2026-06-03

**Context**: Modul Users, Roles, dan Permissions (UI Vuexy + API) sudah ada, tetapi akses operasional PCR masih memakai kolom legacy di tabel `user`. User ingin assignment **roles + project scope** di halaman Users menjadi satu-satunya konfigurasi akses.

**Decision**: Dua dimensi tetap terpisah — **user_projects** untuk scope data, **roles/permissions** untuk aksi & workflow approval. Kolom `level`, `project_code`, `sign`, `pcr_sign` dihapus setelah katalog permission lengkap dan semua check API/UI bermigrasi.

**Rationale**: Permission granular (`forecast.approve.PM`, `cannibal.approve.L2`) memetakan langsung ke workflow existing; role template memudahkan assignment di User tanpa mengisi sign/pcrSign manual.

**Implementation**: Selesai fase 1–4 (2026-06-03). Katalog ~70 permission, role template (admin, super_user, viewer, planner_pf, approver_*, cannibal_l*), migrasi `npm run rbac:migrate`, drop kolom legacy. Detail: `docs/rbac-migration-draft.md` § Implementasi.

**Review Date**: 2026-09-03 (evaluasi fase 5 menu ACL)

---

### Decision: Split `ba_pcr` dari `pcr_forecast` + procurement di `replacement` - 2026-06-19

**Context**: Alur PCR Forecast → BA PCR → Approval → Realisasi mencampur rencana, dokumen BA, dan data eksekusi (PO) dalam satu tabel `pcr_forecast`. `no_ba_pcr` tidak pernah persisten; close forecast dan close WO punya jalur terpisah.

**Decision**:
1. **`pcr_forecast`** — hanya rencana (snapshot, `forecast_status`, `id_rep` nullable, `converted_at`).
2. **`ba_pcr`** — dokumen persetujuan (`no_ba_pcr`, status BA, `submitted_by`).
3. **`pcr_forecast_approval`** — FK ke `id_ba_pcr` (bukan `id_forecast`).
4. **`replacement`** — tambah `mr_no`, `pr_no`, `po_no`, `return_oldcore_date`, `spb_ba_return_oldcore` (additive only).
5. Close forecast normal: **hanya** saat close WO dengan `po_no` terisi pada replacement ter-link.

**Rationale**: Selaras spreadsheet operasional; `id_rep` di forecast bisa terisi sejak planning (history WO) atau saat convert (komponen baru); PO sebagai sumber kebenaran di WO actual.

**Implementation**: Migration `20260619100000_pcr_forecast_ba_pcr_redesign`, `lib/forecasts/service.ts`, `lib/forecasts/ba-pcr-number.ts`, `lib/replacement/service.ts`.

**Review Date**: 2026-12-19

---

### Decision: Role-Based Access Control via Next.js Middleware + ACL - 2026-03-03

**Context**: Perlu membatasi akses user berdasarkan role (ADMIN_HO, ADMIN_SITE, MECHANIC). Halaman User (CRUD) hanya untuk ADMIN_HO. Menggunakan dokumentasi resmi Next.js untuk middleware.

**Options Considered**:

1. **Hanya client-side (AclGuard + CASL)**
   - ✅ Pros: Sudah ada; tidak perlu cookie
   - ❌ Cons: User bisa buka URL /apps/user/list langsung; API tetap harus di-guard
2. **Next.js Middleware + cookie JWT**
   - ✅ Pros: Route dilindungi di Edge sebelum render; sesuai panduan Next.js
   - ❌ Cons: Perlu set cookie pada login dan clear pada logout; JWT harus berisi role (Edge tidak bisa panggil DB)
3. **getServerSideProps per halaman**
   - ✅ Pros: Fleksibel
   - ❌ Cons: Duplikasi; tidak sentral seperti middleware

**Decision**: Next.js Middleware untuk route protection + CASL untuk UI (menu/halaman) + API guard untuk `/api/users`. JWT payload ditambah `role`; cookie `accessToken` (HttpOnly) diset saat login; middleware memverifikasi dengan **jose** (Edge-compatible).

**Rationale**: Middleware memberikan lapisan pertama di Edge; ACL menyembunyikan menu dan redirect ke 401 jika akses halaman tanpa izin; API guard mencegah panggilan langsung ke API users oleh non-ADMIN_HO.

**Implementation**: `src/middleware.js`, `src/configs/acl.js` (cannot user-list untuk ADMIN_SITE/MECHANIC), nav item Users pakai `subject: 'user-list'`, halaman user list pakai `UserList.acl`, login set cookie + JWT role, `POST /api/auth/logout`, API users require ADMIN_HO.

**Review Date**: N/A.

---

### Decision: Production Deployment — Windows + XAMPP, Next.js Self-Hosted - 2026-03-10

**Context**: Aplikasi siap production; server internal Windows dengan XAMPP (IP 192.168.32.37). Perlu panduan sesuai dokumentasi resmi Next.js.

**Decision**: Self-hosting dengan `next build` + `next start` (Node.js). MySQL dari XAMPP; Apache opsional sebagai reverse proxy. Process manager (PM2 atau NSSM) untuk persistensi. Panduan lengkap di `docs/deployment-production.md` mengacu pada [Next.js Production Checklist](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist) dan [Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting).

**Implementation**: Dokumen `docs/deployment-production.md`; referensi di `docs/architecture.md` § Technology Stack.

**Review Date**: N/A.

---

### Decision: Prisma Schema — Attachment Polymorphic & Plan–Actual One-to-One - 2026-02-23

**Context**: Implementasi schema Prisma sesuai `docs/maintenance-monitoring-system.md` §5. Attachment punya `entity_type` (MAINTENANCE_PLAN | MAINTENANCE_ACTUAL) dan `entity_id`; satu plan bisa punya banyak actual (dari sudut plan), tapi desain bilang 1 plan → 0..1 actual.

**Options Considered**:

1. **Relasi eksplisit Attachment → Plan dan Attachment → Actual**
   - ✅ Pros: Query via Prisma include
   - ❌ Cons: Prisma tidak mendukung polymorphic FK ke dua tabel; constraint name bentrok
2. **Attachment tanpa relasi ke Plan/Actual; Plan/Actual tanpa field attachments**
   - ✅ Pros: Sesuai model polymorphic (entity_type + entity_id), query di aplikasi dengan filter
   - ❌ Cons: Tidak bisa `plan.attachments` di Prisma
3. **Satu FK optional (plan_id atau actual_id) di Attachment**
   - ✅ Pros: Relasi Prisma tetap
   - ❌ Cons: Dua kolom nullable, validasi entity_type vs id harus di aplikasi

**Decision**: Attachment tanpa relasi Prisma ke Plan/Actual. Relasi Plan–Actual one-to-one: `maintenance_actuals.plan_id` diberi `@unique` agar satu plan maksimal satu actual.

**Rationale**: Desain dokumen memakai entity_type + entity_id; Prisma tidak mendukung polymorphic relation native. Query attachment pakai `where: { entityType, entityId }` di kode. One-to-one Plan–Actual dipenuhi dengan `planId` @unique.

**Implementation**: `prisma/schema.prisma` — model MaintenancePlan dan MaintenanceActual tidak punya field `attachments`; model Attachment hanya relasi ke User (uploadedBy). MaintenanceActual.planId @unique. Koneksi database via `.env` DATABASE_URL; `prisma db push` dan `npm run db:seed` dijalankan.

**Review Date**: N/A (implementasi desain).

---

### Decision: Gunakan MySQL (Laragon) sebagai DBMS - 2026-02-19

**Context**: Development environment menggunakan Laragon yang sudah menyediakan MySQL. Agar tidak perlu install PostgreSQL terpisah, DBMS diseragamkan ke MySQL.

**Options Considered**:

1. **Tetap PostgreSQL**
   - ✅ Pros: Sesuai design doc awal
   - ❌ Cons: Perlu install/setup PostgreSQL terpisah dari Laragon
2. **Ganti ke MySQL (Laragon)**
   - ✅ Pros: Sudah terinstall, satu stack dengan Laragon, konsisten dengan environment
   - ❌ Cons: Perlu update schema dan dokumentasi

**Decision**: Gunakan MySQL. Prisma provider diubah ke `mysql`, seluruh dokumentasi (architecture, maintenance-monitoring-system, AGENTS, todo) dan .env.example disesuaikan.

**Rationale**: Laragon sudah menyediakan MySQL; mengurangi dependency dan mempermudah development lokal.

**Implementation**: `prisma/schema.prisma` provider = "mysql"; `.env.example` DATABASE_URL format `mysql://root:@localhost:3306/arka_mms`; update docs/\* dan AGENTS.md.

**Review Date**: N/A (keputusan environment).

---

### Decision: Align Documentation with maintenance-monitoring-system.md - 2026-02-19

**Context**: Workspace `arka-mms` berisi dokumentasi yang masih mengacu ke ARKA HERO HRMS. Desain Maintenance Monitoring System ada di `docs/maintenance-monitoring-system.md`. Perlu menyelaraskan seluruh dokumentasi dengan konteks MMS.

**Options Considered**:

1. **Keep ARKA HERO docs, add MMS as secondary**
   - ✅ Pros: Preserves existing content
   - ❌ Cons: Confusing context, wrong project reference
2. **Replace all docs with MMS context**
   - ✅ Pros: Clear single project focus, AI agents get correct context
   - ❌ Cons: Lose ARKA HERO specific details (not relevant for arka-mms)
3. **Update AGENTS.md + key docs to reference maintenance-monitoring-system.md**
   - ✅ Pros: Single source of truth, docs aligned with project folder
   - ❌ Cons: Requires updates across multiple files

**Decision**: Replace/align documentation dengan konteks MMS. AGENTS.md, architecture.md, todo.md, backlog.md, decisions.md diperbarui. maintenance-monitoring-system.md sebagai sumber kebenaran desain.

**Rationale**:

- Folder proyek adalah `arka-mms` (Maintenance Monitoring System)
- maintenance-monitoring-system.md sudah berisi desain lengkap (ERD, flow, API, business rules)
- AI agents dan developer perlu konteks yang konsisten
- Implementasi akan dimulai berdasarkan desain tersebut

**Implementation**:

- AGENTS.md: Tambah section "Project Context" dengan referensi ke maintenance-monitoring-system.md
- docs/architecture.md: Ganti ARKA HERO dengan arsitektur MMS dari design spec
- docs/todo.md: Task implementasi MMS (Next.js, Prisma, dll.)
- docs/backlog.md: Backlog fitur MMS
- docs/decisions.md: Header diperbarui untuk MMS

**Review Date**: 2026-06-01 (revisit when implementation phase begins)

---

## Archived Decisions (ARKA HERO - not applicable to MMS)

### Decision: Remove Unused leave_calculations Table - 2026-01-15

**Context**: The `leave_calculations` table and `LeaveCalculation` model were introduced as future infrastructure for an audit trail of leave entitlement calculations, but no code ever populated or queried this table. All current leave logic relies on `leave_entitlements` + `leave_requests` with runtime calculations in `LeaveEntitlement::getLeaveCalculationDetails()`.

**Options Considered**:

1. **Implement Full Audit Trail Using leave_calculations**
   - ✅ Pros: Strong historical audit trail, point-in-time balance snapshots, better for compliance
   - ❌ Cons: Additional complexity, data duplication, requires service layer and backfill, not currently needed by business
2. **Remove Table and Model as Unused Infrastructure**
   - ✅ Pros: Simpler schema, no dead code, clearer architecture, no maintenance cost for unused components
   - ❌ Cons: Losing prepared path for future audit-trail implementation (would need new migration later)
3. **Keep Table and Model but Still Unused**
   - ✅ Pros: Future option remains open without immediate work
   - ❌ Cons: Technical debt (dead schema + model), confusing for future developers, misleading documentation

**Decision**: Remove unused `leave_calculations` table and `LeaveCalculation` model.

**Rationale**:

- No production code path ever writes to or reads from `leave_calculations` (confirmed via code search and DB count = 0)
- Current leave features (entitlements, requests, reports) work entirely via `leave_entitlements` and `leave_requests`
- Keeping unused schema and model adds cognitive load and can mislead future maintenance
- If a formal audit trail is required in the future, it can be reintroduced with a fresh design aligned to real requirements

**Implementation**:

- Added migration `2026_01_15_120000_drop_leave_calculations_table.php` to drop `leave_calculations` (with down() recreating the latest known structure)
- Deleted `app/Models/LeaveCalculation.php`
- Removed `leaveCalculations()` relationship from `LeaveRequest` model
- Updated `docs/architecture.md` to remove `LeaveCalculation` and `leave_calculations` from the current model/table list

**Review Date**: 2026-12-01 (revisit if audit/compliance requirements around leave balances appear)

### Decision: Leave Entitlement Dual-System Architecture - 2025-09-XX

**Context**: ARKA has two types of projects with different leave management needs:

- Standard projects: Traditional office-based work with DOH-based leave entitlements
- Operational projects: Shift-based work requiring roster management and periodic leave

**Options Considered**:

1. **Single System with Complex Rules**
   - ✅ Pros: Unified codebase, single table structure, easier maintenance
   - ❌ Cons: Complex conditional logic, difficult to understand, prone to bugs
2. **Separate Systems for Each Project Type**
   - ✅ Pros: Clear separation, easier to understand, independent evolution
   - ❌ Cons: Code duplication, separate UIs, harder to maintain consistency
3. **Hybrid System with Project Classification**
   - ✅ Pros: Single codebase with clear business rules, flexible, maintainable
   - ❌ Cons: Requires project classification configuration, some conditional logic

**Decision**: Hybrid System with Project Classification

**Rationale**:

- Projects table includes `leave_type` field ('standard' vs 'periodic')
- Single entitlement generation system that adapts based on project classification
- Group 1 (standard): DOH-based calculations only
- Group 2 (periodic): Hybrid calculation (roster-based periodic + DOH-based standard types)
- Maintains single database schema while supporting different business rules
- Clear documentation in technical flow document

**Implementation**:

- `projects.leave_type` column determines calculation method
- `LeaveEntitlementController::generateProjectEntitlements()` contains business logic
- `docs/LEAVE_ENTITLEMENT_TECHNICAL_FLOW.md` documents the rules
- LSL special rules implemented for Group 2 (requires 10 days periodic leave taken)
- Roster system integrated with `levels` table for pattern configuration

**Review Date**: 2026-06-01 (after 6 months of production use)

---

### Decision: Recruitment Multi-Stage Table Architecture - 2025-08-XX

**Context**: Initial recruitment system used single `recruitment_assessments` and `recruitment_offers` tables. As requirements grew, it became difficult to manage different data structures for each recruitment stage (CV review, psychometric test, theory test, interviews, offering, MCU, hiring).

**Options Considered**:

1. **Single Table with JSON Columns**
   - ✅ Pros: Simple schema, easy to add fields, flexible structure
   - ❌ Cons: No query optimization, difficult validation, poor data integrity, hard to report
2. **Single Table with Many Nullable Columns**
   - ✅ Pros: Relational structure, query optimization possible
   - ❌ Cons: Very wide table, many unused columns per record, confusing schema
3. **Separate Table Per Stage**
   - ✅ Pros: Clear data structure, optimal queries, strong validation, easy to extend
   - ❌ Cons: More migrations, more models, more complexity in code

**Decision**: Separate Table Per Stage

**Rationale**:

- Each recruitment stage has distinct data requirements
- CV Review: result, notes
- Psikotes: provider, result, score, notes
- Theory Test: result, score, notes
- Interview: 3 separate interview records (user, HR, director) with different assessors
- Offering: salary offer, negotiation, acceptance decision
- MCU: provider, result, notes
- Hiring: agreement type, start date, employee creation

**Implementation**:

- Created 7 stage-specific tables: `recruitment_cv_reviews`, `recruitment_psikotes`, `recruitment_tes_teori`, `recruitment_interviews`, `recruitment_offerings`, `recruitment_mcu`, `recruitment_hiring`
- `recruitment_sessions` table tracks current stage and overall status
- `RecruitmentSessionController` manages stage transitions
- Migration 2025_08_07_150012 drops old tables
- Each stage has dedicated update methods in controller

**Review Date**: 2026-03-01

---

### Decision: Centralized Letter Numbering System - 2025-06-XX

**Context**: Multiple document types (Official Travel, Recruitment FPTK, future documents) require sequential letter numbers. Manual assignment was error-prone and caused number conflicts.

**Options Considered**:

1. **Per-Module Letter Numbering**
   - ✅ Pros: Simple per-module implementation, no dependencies
   - ❌ Cons: Duplicate code, inconsistent formats, no centralized tracking
2. **Centralized Service with Database**
   - ✅ Pros: Single source of truth, consistent format, lifecycle tracking, integration ready
   - ❌ Cons: Additional complexity, requires API integration
3. **Manual Assignment Only**
   - ✅ Pros: Simple, no automation needed
   - ❌ Cons: Error-prone, slow, no tracking

**Decision**: Centralized Service with Database

**Rationale**:

- Letter numbers are critical business documents requiring auditability
- Sequential number generation needs to be thread-safe and conflict-free
- Multiple document types will need letter numbers in the future
- Letter number lifecycle (available → reserved → used → cancelled) needed for proper tracking
- API integration allows documents to auto-request numbers upon approval

**Implementation**:

- `letter_categories` table: category configuration (code, format, numbering behavior)
- `letter_subjects` table: subject templates per category
- `letter_numbers` table: letter number records with status tracking
- `LetterNumberApiController`: API endpoints for document integration
- Format: `{sequential}/{category_code}/{subject_code}/{project_code}/{month_roman}/{year}`
- Integration points: `OfficialtravelController`, `RecruitmentRequestController`
- Auto-assignment on approval via API call

**Review Date**: 2026-06-01

---

### Decision: Laravel Sanctum for API Authentication - 2025-03-XX

**Context**: Need to provide RESTful API access for potential mobile app, third-party integrations, and JavaScript SPA features while maintaining session-based authentication for web interface.

**Options Considered**:

1. **Laravel Passport (OAuth2)**
   - ✅ Pros: Full OAuth2 implementation, supports client credentials, industry standard
   - ❌ Cons: Overkill for internal API, complex setup, more overhead
2. **Laravel Sanctum (Token-based)**
   - ✅ Pros: Lightweight, simple token management, works with SPA and mobile, built for Laravel
   - ❌ Cons: No OAuth2 flows, simpler than Passport
3. **JWT (tymon/jwt-auth)**
   - ✅ Pros: Stateless, standard JWT implementation
   - ❌ Cons: Third-party package, more complex to integrate with Laravel ecosystem

**Decision**: Laravel Sanctum

**Rationale**:

- Lightweight solution perfect for first-party API authentication
- Supports both SPA authentication and mobile app tokens
- Easy integration with existing session-based authentication
- Built and maintained by Laravel team
- Sufficient for current and foreseeable future needs
- Simple token management (issue, revoke, expiry)

**Implementation**:

- Installed `laravel/sanctum` package
- API routes protected with `auth:sanctum` middleware
- Authentication endpoints: `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/user`
- Token stored in `personal_access_tokens` table
- Legacy `/api/*` routes remain unprotected for backward compatibility
- Versioned `/api/v1/*` routes require authentication

**Review Date**: 2027-01-01 (after 2 years of use)

---

### Decision: AdminLTE 3 for UI Framework - 2025-XX-XX

**Context**: Need professional admin dashboard interface with comprehensive UI components, responsive design, and active community support.

**Options Considered**:

1. **Custom Bootstrap 4 Implementation**
   - ✅ Pros: Full control, no third-party dependencies, lightweight
   - ❌ Cons: Time-consuming, need to build all components from scratch, harder to maintain
2. **AdminLTE 3 (Bootstrap 4 based)**
   - ✅ Pros: Comprehensive components, professional design, active community, Laravel integration, pre-built widgets
   - ❌ Cons: Some unused features, specific design constraints
3. **CoreUI**
   - ✅ Pros: Modern design, good documentation
   - ❌ Cons: Less Laravel-focused, smaller community

**Decision**: AdminLTE 3

**Rationale**:

- Most popular admin template for Laravel (large community)
- Comprehensive widget library (cards, tables, forms, charts)
- Bootstrap 4 based (familiar to developers)
- Excellent documentation and examples
- Professional appearance suitable for enterprise HR system
- Active maintenance and regular updates
- Includes Chart.js integration for dashboards
- Pre-built authentication pages

**Implementation**:

- AdminLTE 3 assets in `public/assets/`
- Main layout: `resources/views/layouts/app.blade.php`
- Blade components for common widgets
- Custom CSS in `resources/css/app.css` for ARKA-specific branding
- JavaScript initialization in view files
- Badge color system for recruitment results: success (green), danger (red), warning (yellow), secondary (gray)

**Review Date**: 2026-12-01

---

### Decision: Spatie Laravel Permission for RBAC - 2025-03-XX

**Context**: Need robust role-based access control system to manage permissions for different user types (Administrator, HR Supervisor, HR Manager, Division Manager, Employee).

**Options Considered**:

1. **Custom RBAC Implementation**
   - ✅ Pros: Full control, no dependencies, tailored to needs
   - ❌ Cons: Time-consuming, need to handle all edge cases, maintenance burden
2. **Spatie Laravel Permission**
   - ✅ Pros: Battle-tested, flexible, comprehensive features, active maintenance, Laravel-first
   - ❌ Cons: Learning curve, some features may not be needed
3. **Laravel Built-in Gates & Policies Only**
   - ✅ Pros: Native Laravel, simple for basic needs
   - ❌ Cons: No role management UI, manual permission assignment, lacks advanced features

**Decision**: Spatie Laravel Permission

**Rationale**:

- Industry-standard package for Laravel RBAC
- Supports roles and direct permissions
- Flexible: assign permissions to roles or directly to users
- Middleware support for route protection
- Blade directives for UI permission checks (@role, @can)
- Database-backed (easy to manage via UI)
- Caching support for performance
- Widely used and well-documented

**Implementation**:

- Package: `spatie/laravel-permission: ^6.16`
- Tables: `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`
- Predefined roles: administrator, hr-supervisor, hr-manager, div-manager, user
- Seeders: `RoleAndPermissionSeeder`, `RecruitmentRolePermissionSeeder`
- Controllers: `RoleController`, `PermissionController` for management UI
- Middleware: `role`, `permission` for route protection
- Models: `User` model uses `HasRoles` trait

**Review Date**: 2027-01-01

---

### Decision: Project-Based Leave Type Classification - 2025-09-XX

**Context**: Different projects have different leave management requirements. Need a way to distinguish between standard office work and shift-based operational work.

**Options Considered**:

1. **Hardcoded Project Lists in Code**
   - ✅ Pros: Simple, no database changes needed
   - ❌ Cons: Requires code deployment for changes, not flexible, hard to maintain
2. **Boolean Flag: is_operational**
   - ✅ Pros: Simple database change, clear distinction
   - ❌ Cons: Limited to two types, not extensible if more types needed
3. **Enum Field: leave_type**
   - ✅ Pros: Flexible for future types, clear semantics, database-driven
   - ❌ Cons: Requires migration, need to update existing records

**Decision**: Enum Field: leave_type

**Rationale**:

- Future-proof: can add more leave types if needed (e.g., 'hybrid', 'remote')
- Database-driven: no code deployment needed to classify new projects
- Clear business meaning: 'standard' vs 'periodic'
- Single source of truth in database
- Easy to query and report on

**Implementation**:

- Migration 2025_09_29_093451: added `leave_type` enum to `projects` table
- Values: 'standard' (default), 'periodic'
- Group 1 Projects (standard): 000H, 001H, APS, 021C, 025C
- Group 2 Projects (periodic): 017C, 022C
- Leave entitlement generation logic checks this field
- Documented in `docs/LEAVE_ENTITLEMENT_TECHNICAL_FLOW.md`

**Review Date**: 2026-09-01

---

### Decision: Toast Helper Functions Over Toastr Library - 2025-XX-XX

**Context**: Need consistent notification system across the application. Initially using toastr JavaScript library directly, causing inconsistent styling and implementation.

**Options Considered**:

1. **Direct Toastr JavaScript Library Usage**
   - ✅ Pros: Full control, client-side only
   - ❌ Cons: Inconsistent usage, no server-side validation messages, different styles across modules
2. **SweetAlert2 Only**
   - ✅ Pros: Beautiful modals, comprehensive features
   - ❌ Cons: Overkill for simple notifications, more intrusive
3. **Custom Toast Helper Functions**
   - ✅ Pros: Consistent usage, server-side integration, simple API, unified styling
   - ❌ Cons: Abstraction layer, need to implement helper functions

**Decision**: Custom Toast Helper Functions

**Rationale**:

- Consistent API across all controllers: `toast_success()`, `toast_error()`, `toast_warning()`, `toast_info()`
- Server-side session flash messages automatically displayed
- Single point of configuration for styling
- Easy to switch underlying library if needed
- Forces consistent usage patterns
- Works with both redirect responses and API responses
- English messages for consistency

**Implementation**:

- Helper functions in `app/Helpers/Common.php`
- Functions: `toast_success($message)`, `toast_error($message)`, `toast_warning($message)`, `toast_info($message)`
- Auto-loaded via `composer.json` autoload files
- Controllers return with toast helpers instead of direct toastr
- JavaScript toast display in main layout
- Package: `realrashid/sweet-alert` for underlying functionality

**Review Date**: 2026-06-01

---

### Decision: Postman API MCP for API Documentation - 2025-XX-XX

**Context**: Need to maintain API documentation synchronized with codebase. Manual Postman collection updates are time-consuming and error-prone.

**Options Considered**:

1. **Manual Postman Collection Updates**
   - ✅ Pros: Simple, no automation needed, full control
   - ❌ Cons: Time-consuming, error-prone, often outdated, hard to maintain
2. **Swagger/OpenAPI Specification**
   - ✅ Pros: Industry standard, auto-documentation, interactive UI
   - ❌ Cons: Requires extensive annotations, Laravel integration not perfect, learning curve
3. **Postman API MCP Integration**
   - ✅ Pros: Automated sync, maintains Postman format, programmatic access, folder organization
   - ❌ Cons: Requires MCP setup, depends on Postman API

**Decision**: Postman API MCP Integration

**Rationale**:

- Automated sync of API routes to Postman collection
- Maintains familiar Postman interface for testing
- Programmatic collection updates via MCP tools
- Organized folder structure matching Laravel route groups
- Environment variables for BASE_URL and TOKEN
- Can generate collections from OpenAPI specs
- Supports mock server creation for testing
- Team already uses Postman, no new tool to learn

**Implementation**:

- MCP server: `postman-api-mcp`
- Collection name: "ARKA HERO - API"
- Workspace-scoped collection management
- Folder organization:
  - Authentication
  - Departments, Employees, Official Travels
  - Leave Management, Recruitment
  - Master Data, Dashboard, Letter Numbers
- Variables: `BASE_URL`, `TOKEN`
- Rules documented in `.cursor/rules/postman-api.mdc`
- Standard workflow: get workspace → get collection → update/create requests → sync

**Review Date**: 2026-06-01

---

---

## Decision: Cannibal PLM → PGM and OGM before PGM — 2026-08-06

**Context**: Cannibal memakai kode PLM (Plant Manager) lalu OGM. Business meminta label **Plant General Manager (PGM)** dan urutan **OGM dulu, baru PGM**.

**Decision**:
- Rename level cannibal `PLM` → `PGM` (label Plant General Manager)
- Urutan: PS → PM → **OGM → PGM** → OD → PD
- BA PCR tetap `PLM` = Plant Manager (tidak diubah)

**Implementation**: `lib/approval/registry.ts`; print box; role `plant_manager` → `cannibals.approve.PGM`; migrasi `scripts/approval/migrate-cannibal-plm-to-pgm.ts`; legacy permission `cannibals.approve.PLM` di-deactivate.

**Review Date**: 2026-11-06

---

## Decision: Cannibal Approval Adds President Director (PD) — 2026-08-06

**Context**: Cannibal BA sebelumnya berakhir di Operational Director (OD). Business meminta Presiden Direktur ikut menandatangani.

**Decision**: Tambah level `PD` setelah `OD` di `CANNIBAL_BA_APPROVAL_CHAIN` (`lib/approval/registry.ts`). Role template `president_director` mendapat `cannibals.approve.PD`.

**Implementation**:
- Registry: PS → PM → PLM → OGM → OD → **PD**
- Print BA: kotak ACKNOWLEDGE BY menambah PRESIDENT DIRECTOR
- BA in-flight: backfill `npx tsx scripts/approval/backfill-approval-level.ts --chain=CANNIBAL --level=PD`
- Permission: `npm run rbac:seed` (katalog generate dari registry)

**Review Date**: 2026-11-06

---

## Decision: Centralized Approval Level Registry — 2026-07-06

**Context**: Level approval BA PCR (6 level) dan Cannibal (5 level) tersebar di banyak file (workflow server/client, RBAC, ACL, dashboard, seed). Menambah level baru berisiko inkonsistensi.

**Options Considered**:

1. **Biarkan duplikasi + dokumentasi manual**
   - ✅ Pros: tidak ada refactor
   - ❌ Cons: mudah lupa update salah satu file

2. **Registry terpusat + workflow engine generik**
   - ✅ Pros: satu sumber kebenaran; workflow revoke/revisi otomatis mengikuti urutan; permission RBAC di-generate
   - ❌ Cons: refactor awal

**Decision**: Registry terpusat di `lib/approval/registry.ts` dengan engine generik `lib/approval/workflow-engine.ts`.

**Rationale**: Penambahan level baru cukup edit registry + seed permission + backfill DB; UI timeline, queue, dan validasi server mengikuti otomatis.

**Implementation**:

- `lib/approval/registry.ts` — definisi chain `PCR_FORECAST` dan `CANNIBAL`
- `lib/approval/workflow-engine.ts` — logika sequential approval (pending, revise, revoke)
- `lib/approval/instances.ts` — engine siap pakai per dokumen
- `src/utils/approval-registry.js` — re-export untuk client
- `scripts/approval/backfill-approval-level.ts` — backfill baris approval in-flight
- Permission catalog memakai `buildApprovePermissionDefs()`

**Cara menambah level baru**:

1. Tambah entry di `lib/approval/registry.ts` (kode max 5 karakter)
2. Jalankan seed/migrate permission RBAC
3. Assign permission ke role yang relevan
4. Backfill: `npx tsx scripts/approval/backfill-approval-level.ts --chain=... --level=...`
5. (PCR) Tambah `waitStageLabel` jika perlu filter queue; perbarui template print jika ada kotak tanda tangan per level

**Review Date**: 2026-10-06

---

## Future Decisions to Document

- Testing strategy (when implemented)
- CI/CD pipeline (when implemented)
- Production deployment strategy
- Backup and disaster recovery plan
- Performance optimization strategies
- Mobile app architecture (if developed)
- Third-party integration patterns

---

**Next Review**: Review all decisions quarterly to ensure they remain valid and update as needed.
