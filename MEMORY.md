# Project Memory — ARKA PCR

## 2026-09-01 — Close WO: normal vs warranty forecast requirements

- **Normal forecast** (`is_warranty = false`): wajib MR, PR, PO, oldcore return; **installation report PDF** hanya jika komponen **MAJOR**.
- **Warranty forecast** (`is_warranty = true`): MR/PR/PO tidak wajib; **installation report PDF** hanya jika komponen **MAJOR**.
- Logic: `lib/replacement/close-requirements.ts`, `closeReplacement`, `CloseReplacementDialog`, `linkedForecast.isWarranty`.
- Upload PDF: `POST /api/replacements/[id]/report` → disk `UPLOAD_DIR/replacements/{idRep}/`. Nginx `client_max_body_size 55m` (selaras max 50 MB).

## 2026-09-01 — Submit BA PCR: harga quote tidak boleh di-reset refresh

- Penyebab: `submitForecastBa` memanggil `refreshForecastMetrics` yang menimpa `priceComponent` dengan harga model-component (`commod.price`), sering 0/null.
- Fix: `refreshForecastMetrics` tidak lagi mengubah `priceComponent` — harga quote dari create/edit tetap dipakai saat submit BA dan bulk refresh.

## 2026-09-01 — Warranty Forecast (PS→PM→PLM)

- Flag `pcr_forecast.is_warranty` set at create; eligible only if snapshot `lifePercent < 100`.
- BA seed/fullyApproved/notify/UI print resolve chain via `getForecastApprovalChain(isWarranty)` — warranty stops at PLM (no OD/FD/PD).
- Dual create buttons in `ForecastDialog` when under policy; list/detail chip + BA “Pergantian Warranty”.
- Migration `20260901100000_pcr_forecast_is_warranty`. If `prisma generate` EPERM on Windows, stop Next.js then regenerate.

## 2026-08-31 — arka-docker pull = pull + rebuild

- "Pull di arka-docker" (dan semakna) = `git pull` di `/home/skyone/stack/apps/app81/arka-pcr`, lalu `docker compose build arka-pcr` + `up -d --no-deps arka-pcr`.
- Jangan timpa `.env` server. Pastikan container Up/healthy sebelum selesai. Skill: `ssh-arka-docker`.

## 2026-08-31 — Report date format 01 Jan 2000

- Summary report grids pakai `formatDisplayDate` (`src/utils/date-format.js`) → `01 Jan 2000`.
- Excel exports (PCR, forecast, cannibal, condition, inspection, SOS + per-unit) pakai `formatDisplayDate` di `lib/utils/date-only.ts`.
- Plan Periode tetap short label (`Jul-26`).

## 2026-08-31 — Models Add Mapping: component list truncated

- Dialog mapping kirim `pageSize: 500` → `parseOptionalPageFromSearchParams` aktif → `MAX_PAGE_SIZE` **100**. Master `comp` ~400+ baris.
- Fix: GET `/api/components` tanpa page/pageSize (full list), sama seperti forecast matrix. Label opsi sertakan `compType` bila ada.

## 2026-08-31 — Docker build: getCannibalApprovalProjectCode weak type

- `next build` gagal: (1) weak type `getCannibalApprovalProjectCode` vs `mapCannibalRecord`; (2) ESLint padding/newline di approval-labels, CannibalTransferForm, ForecastTableHeader.
- Fix: terima `ba: unknown`; blank line sebelum multiline-const / return / comment. `npm run build` lokal lolos.

## 2026-08-31 — SearchableSelect for remaining PCR dropdowns

- Remaining ARKA PCR `CustomTextField select` / MUI `Select` filters and form dropdowns now use `src/@core/components/mui/searchable-select`.
- Vuexy demo pages (`src/views/forms/**`, `src/pages/forms/**`, invoice/calendar/chat/email, `user/view/**`) were left unchanged.
- `onChange` stays `e.target.value` (same as CustomTextField select). Multiple project scope in Add User uses `multiple` + array value.
- Radios, toggles, date/month inputs, and print views were not converted.

## 2026-08-31 — Export cannibal: HM Component Remove/Install

- Excel `/api/exports/cannibals` menambah kolom `HM Component Remove` dan `HM Component Install` dari `pairs.*.hmComp`.

## 2026-08-31 — Cannibal unit picker terpotong 100

- Form kirim `pageSize: 500` → `parseOptionalPageFromSearchParams` aktif → `MAX_PAGE_SIZE` **100**. Bukan filter status.
- Fix: fetch unscoped tanpa pageSize; `listUnitsByProjectUnscoped` mengembalikan semua unit project.

## 2026-08-31 — Cannibal approval scope = project BA

- Gate PS/PM, antrian `/approvals`, dan email recipient memakai `ba.projectCode` saja (`getCannibalApprovalProjectCode`).
- Project unit REMOVE/INSTALL tidak mempengaruhi siapa yang boleh approve / siapa yang dapat notifikasi.

## 2026-08-31 — Cannibal: project unit unscoped + status form

- REMOVE/INSTALL: daftar project **tidak** di-scope user (`/fleet/projects?unscoped=1`); unit mengikuti project sisi itu (`/fleet/units?unscoped=1`).
- Save BA boleh pakai unit di luar scope user (`ensureEquipmentCache(..., { ignoreProjectScope: true })`).
- Project/unit REMOVE dan INSTALL independen; ganti project BA tidak mengubah transfer.
- Cannibalized Component Status: Good / Damaged / Worn disembunyikan (kecuali BA lama yang sudah memakai).

## 2026-08-31 — `.env` tidak boleh ke GitHub

- `.gitignore` sebelumnya hanya `.env*.local`, jadi `.env` tetap ter-track dan sudah ada di `origin/main`.
- Fix: ignore `.env` + `.env.*`, kecuali template `.env.example` / `.env.*.example`; `git rm --cached .env` (file lokal tetap ada).
- File sudah pernah ter-push: hapus dari tree saja tidak membersihkan history. Rotate secret yang pernah masuk repo setelah commit+push ke GitHub.

## 2026-08-28 — Create forecast: harga quote tidak tersimpan

- Penyebab: (1) auto-fill harga dari model-component bisa menimpa input user saat preview selesai load (race); (2) format `1.500.000` ter-parse `Number()` jadi `1.5` → server pakai `snapshot.priceComponent` (harga lama di WEB).
- Fix: prefill cek `priceTouched` di dalam `setForm`; `parsePriceComponentValue` shared (`lib/utils/price-component.ts`) untuk client + Zod; validasi eksplisit di dialog bila field harga terisi tapi invalid.

## 2026-08-27 — User Manual v2.0

- `docs/user-manual/ARKA-PCR-User-Manual.md` diperbarui (Bahasa Indonesia) + screenshot di `docs/user-manual/images/`.
- Capture: `node scripts/capture-user-manual-screenshots.mjs` (Chrome `channel: 'chrome'`, login seed `admin` / `admin123`).
- Screenshot Forecast/BA PCR detail kosong di dataset remigrasi (forecast = 0); list + Auto Generate tetap didokumentasikan. Cannibal/WO/SOS/Inspection pakai data live.

## 2026-08-27 — SAP Service Layer di Docker (192.168.32.146)

- Container **tidak resolve** `arkasrv2` (`EAI_AGAIN`). Host Docker **bisa** TCP ke Service Layer `192.168.32.26:50000` (cert CN `ARKASRV2`, expired Oct 2025 — `SAP_B1_TLS_REJECT_UNAUTHORIZED=false` tetap perlu).
- Fix DNS: `extra_hosts: arkasrv2:192.168.32.26` pada `arka-pcr` + `arka-pcr-tools` di `/home/skyone/stack/docker-compose.yml` (snippet repo: `deploy/docker-compose.arka-pcr.snippet.yml`). Setelah recreate, lookup `arkasrv2` → `192.168.32.26`.
- CompanyDB **`SBO_ARKA_NEW` → 401 Login failed**; **`SBO_AAP_NEW` → 200 + B1SESSION** (sama `.env.local`). Ping tools: `ok: true`, group Sparepart 114 ada. Recreate wajib setelah ubah `.env`.
- Jangan `npm run sap:ping` di tools (`--env-file=.env.local`). Pakai `npx tsx scripts/ping-sap-b1.ts`.

## 2026-08-27 — Remigrasi dump 26 Aug ke Docker `arka_pcr_new` (192.168.32.146)

- App dihentikan selama impor. Backup pre-legacy: `backup/arka_pcr_new_pre_legacy_20260827-101751.sql.gz`. Staging `arka_pcr_legacy` di MySQL Docker (GRANT user `arka-pcr`).
- Import besar via Prisma `$queryRawUnsafe` (tools image tanpa mysql CLI). Pagination + `DATE_FORMAT` untuk replacement/sos/inspection/ba/kanibal (hindari P2010 full-table).
- HM resume sempat duplikat (419471) karena `createMany skipDuplicates` tanpa unique index. Dedup keep `MIN(id_hm)` per `(id_unit, date_hm, hm_unit)` → **245510** (backup `backup/arka_pcr_new_hm_before_dedup_20260827-105420.sql.gz`).
- Count server = lokal: hm 245510, replacement 12569, sos 8882, inspection 2512, condition 1168, ba 2522, ba_approval 4144, kanibal 4825, commod 4248, user **1** (seed), forecast 0. Mapping 540/991 fleet.
- `arka-pcr` Up lagi; URL `http://192.168.32.146:8081`. Login seed `admin` / `admin123` — ganti password segera.
- Skrip pagination ada di laptop (belum tentu ter-commit). Tools run: mount `scripts/` + `npx tsx scripts/migration/...` (jangan `npm run migrate:*` yang `--env-file=.env.local`).

## 2026-08-27 — Remigrasi dump 26 Aug ke `arka_pcr_new` lokal

- Reset DB v2 → 24 migrasi + seed (`admin` / `admin123`, 1 user; **user legacy tidak diimpor**).
- Fleet sync: 991 unit. Fix `sync-cache.ts`: upsert `fleet_model_cache` dulu dari fetch equipment yang sama (hindari FK `fleet_model_id` kosong).
- Mapping: 540/542 unit, 198 model. Unmapped unit: `T 1`, `DZ 0456`. Unmapped model: `EH1100-3 A`, `Pantera 1101`, `ET 110 PS DUMP/TRUCK`.
- Hasil v2 vs legacy: hm 245510 / 437066 (skip ~191k: duplikat unit+tanggal+hm + 786 tanggal invalid); replacement 12569 / 14949; sos 8882 / 9716; inspection 2512 / 2607; ba 2522 / 2567; kanibal 4825 / 5140; condition 1168 (recompute); commod 4248 (43 remap); forecast 0 (tidak ada di dump).
- CSV mapping gitignored. Target berikutnya: ulang pipeline di server Docker.

## 2026-08-27 — Dump legacy `arka_pcr.sql` (26 Aug 2026) diimpor ke staging

- Sumber: `C:\Users\Frizky Ramadhan\Downloads\arka_pcr.sql` (phpMyAdmin, 24 MB, gen 26 Aug 2026 10:21).
- Salinan kerja: `data/migration/legacy.sql` (gitignored). Impor ke `arka_pcr_legacy` lokal — **semua data operasional utuh**.
- Tabel `user` (54 baris) tetap di staging legacy, **tidak** dipindah ke v2 (RBAC seed terpisah).
- Count exact: ba 2567, kanibal 5140, replacement 14949, hm 437066, sos 9716, inspection 2607, condition 1325, commod 4332, comp 404, unit 542, model 199, project 17.
- Tidak ada `pcr_forecast` di dump (impor Excel opsional).
- Pipeline ke `arka_pcr_new` **belum** dijalankan: DB lokal masih isi staging 4 Jun 2026; butuh mapping CSV baru + target kosong/cutover.

## 2026-08-26 — Replay-safe Prisma migrations (fresh Docker DB)

- Server P3018 `20260623140000`: MySQL 1553 — tidak bisa DROP unique `ba_pcr_id_forecast_key` selama FK `ba_pcr_id_forecast_fkey` masih ada. Fix: DROP FK → DROP unique → restore FK → add `is_active`.
- `20260624120000` pakai `AFTER statement_confirmed_at` padahal kolom itu baru ada di `20260630120000`.
- Folder `20260812050000_notification_log` kosong (P3015); SQL CREATE `notification_log` dipulihkan; `20260812120000` tetap no-op.
- `20260820120000`: `id_caused` nullable harus recreate FK `ON DELETE SET NULL`.
- Unique approval index di SQL disamakan ke `pcr_forecast_approval_id_ba_pcr_level_key` (nama Prisma default, sama dengan DB lokal).
- Verified: `prisma migrate deploy` di DB kosong `arka_pcr_migrate_verify` (24/24) + `migrate diff` kosong vs `schema.prisma` + `npm run build` OK.
- Deploy: pull/rebuild image → DROP/CREATE `arka_pcr_new` di server → `up -d` (jangan hanya hapus baris `_prisma_migrations`).

## 2026-08-26 — Fix migrate P3018/P3009 `20260619100000`

- Root cause: `migration.sql` DROP INDEX `uq_forecast_approval_level` — index itu **belum ada** di DB fresh; nama dari init adalah `pcr_forecast_approval_id_forecast_level_key`.
- Error server: `Can't DROP 'uq_forecast_approval_level'` (1091) → P3018 → restart loop P3009.
- Fix: DROP nama index init; pindahkan `DROP INDEX pcr_forecast_status_ba_pcr_status_idx` sebelum DROP kolom `ba_pcr_status`.
- Deploy: sync file → **rebuild** image `arka-pcr` → DROP/CREATE `arka_pcr_new` → `up -d`.

## 2026-08-21 — Cannibal print checkbox compact

- Record & Documentation / planning print no longer uses bulky MUI `Checkbox`.
- Shared `CannibalPrintCheckbox.js` (`PrintCheckbox` 10×10 + `PrintCheckItem`) used by planning + statements/status print sections.


## 2026-08-26 — Kurangi spam email notifikasi

- Hapus event/cron `due_overdue` (`scripts/notify-due-overdue.ts`, `npm run notify:due-overdue`).
- BA PCR: level PS/PM `projectScoped: true`; penerima email = user project BA **atau** HO `000H`.
- Approve final: hanya `fully_approved` (tanpa `approval_decision` ganda ke submitter).
- Dedupe key handoff/requestor/decision: stabil (tanpa `Date.now()`).

## 2026-08-20 — Cannibal Request By (form Rev 5)

- Kolom baru di `ba`: `cannibal_request_role`, `requested_by`, `requested_confirmed_at`, `requested_reject_remark`. `id_caused` jadi nullable. Tabel `kanibal` tidak berubah.
- Role baru `production_superintendent` (Supt. Production requester) — `cannibals.access` saja, bukan `plant_superintendent`.
- Alur: Plant (`DRAFT`) → `PENDING_REQUESTOR` → Logistics → Documentation → PS–PD. Hanya user `requested_by` yang confirm/reject.
- Reject → `REJECTED` (acuan naikkan order P1, remark wajib). Plant edit + submit ulang selalu masuk `PENDING_REQUESTOR` lagi. BA lama yang sudah `PENDING_LOGISTICS+` tidak dipaksa lewat gerbang baru.
- Form/print baru: sembunyikan Symptom, Failure Cause, RESEAL ONLY. REQUEST BY cetakan = requestor + jabatan. Cetakan Rev 5: layout 3 kolom Plant | Request By | Component Status, baris bawah Logistic; komponen `CannibalPrintFormSections.js`.
- API: `GET /api/cannibals/requestors`, `POST .../submit-to-requestor`, `.../confirm-requestor`, `.../reject-requestor`.
- Email: `cannibal_requestor_pending` → requestor; `cannibal_requestor_confirmed` → plant; `cannibal_requestor_rejected` → plant (+ remark); logistics tetap `cannibal_handoff` TO_LOGISTICS.
- Setelah deploy: `npx prisma migrate deploy` + `npm run rbac:seed`.
- Validasi form (`lib/validations/cannibal.ts`) hanya boleh import `requestor-roles.ts`, bukan `requestor.ts` (Prisma). Kalau tidak, `/cannibals` error `DATABASE_URL tidak diset` di browser.


## 2026-08-20 — Grill form BA Kanibal Rev 5 vs arka-pcr-new

- Tabel `kanibal` tidak perlu kolom baru. Gap ada di header `ba` + RBAC, bukan baris REMOVE/INSTALL.
- Plant/Logistic pilih-satu **sudah ada** (radio + boolean flags). Pertanyaan L1/L2/`user.sign` dari app PHP **tidak berlaku** di sini.
- RESEAL ONLY: sembunyikan di form baru, baris `ba_status` tidak dihapus. Form/kolom grilling tertutup; implementasi belum dimulai.
- REQUEST BY cetakan sekarang = Foreman (`statementRequestedBy`), bukan user dari jabatan form.
- Glossary: `docs/domain/ba-kanibal-glossary.md`.


## 2026-08-19 — Hapus UI RUL Estimate (AI)

- Kolom "RUL Estimate (AI)" dihapus dari list forecast dan riwayat replacement; tile di `ForecastDetailSummary` ikut dihapus.
- Snapshot forecast / auto-generate / refresh tidak lagi menghitung regresi RUL. Helper `lib/calculations/rul.ts` dan kolom DB `pcr_forecast.rul_*` dibiarkan (tidak di-drop).

## 2026-08-19 — Cannibal list actions = forecast dropdown

- Kolom Action di `/cannibals` memakai `TableRowActionSelect` (dropdown compact) seperti list forecast, bukan deretan icon button.
- Lebar kolom list cannibal & forecast dinormalisasi (`flex` ~0.75–1.5 + minWidth header) agar mengisi lebar card, bukan menyisakan space kosong di kanan.
- Icon meta baru: `submit-to-logistics`, `execution`, `cancel` (`src/@core/components/table-row-actions`).

## 2026-08-13 — Activity log (Spatie-style)

- Tabel `activity_log`: log_name, description, subject_type/id, event, causer_type/id, properties, attribute_changes.
- API fluent: `activity().causedBy(session).performedOn('PcrForecast', id).log('...')` atau `logActivity({...})`.
- Fail-soft; `ACTIVITYLOG_ENABLED=false` menonaktifkan tulis.
- Admin: `/admin/activity-logs` (`system.admin`). Cleanup: `npm run activitylog:clean`.
- Hook: user CRUD; forecast CRUD + submit/approve/reject; cannibal create/delete/submit/approve/reject + edit plant/logistic/execution/planning + handoff TO_LOGISTICS / STATEMENT_CONFIRMED; replacement CRUD/close/reopen/report; SOS/inspection CRUD; hour-meter CRUD + import summary; condition recompute (`POST /api/conditions`).

## 2026-08-13 — MAIL_ENABLED runtime toggle

- Admin switch On/Off di `/admin/email-notifications` (Runtime status).
- Persist `data/runtime-settings.json` (gitignore); override env `MAIL_ENABLED` tanpa restart.
- API: `PATCH /api/admin/email-test` `{ mailEnabled: boolean }` (`system.admin`).
- `isMailEnabled()` baca override dulu, baru fallback env.

## 2026-08-12 — Email notifications (Nodemailer SMTP)

- Transport: **Nodemailer** + SMTP (`SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, `MAIL_ENABLED`).
- Dev: Mailpit/smtp4dev `127.0.0.1:1025`; prod: corporate relay (e.g. `mail.arka.co.id`).
- Modul: `lib/notifications/` — fail-soft, audit `notification_log`, recipients via RBAC.
- Admin trial: `/admin/email-notifications` (system.admin).

## 2026-08-10 — Cannibal: documentation before approval

- Alur baru: Plant → Logistics → **Record & Documentation** (`PENDING_DOCUMENT`) → Approval (PS→PD) → Ready to Close (`APPROVED`) → Closed.
- Logistics confirm **tidak** lagi auto-promote ke approval; status jadi `PENDING_DOCUMENT`.
- Di `PENDING_DOCUMENT`: satu dialog **Update Documentation** (planning action + MR/PR + WO + catatan); tombol Planning terpisah disembunyikan.
- Sebelum `POST .../submit`: wajib **MR# + PR#** (UI disable + toast + service) + WO REMOVE/INSTALL + `executionNotes` + `documentationComplete`.
- Close tetap di `APPROVED`.
- Level approval tidak berubah: PS → PM → OGM → PGM → OD → PD.

## 2026-08-06 — Cannibal approval: PLM→PGM + order OGM sebelum PGM

- Chain cannibal: **PS → PM → OGM → PGM → OD → PD** (`lib/approval/registry.ts`).
- `PLM` (Plant Manager) diganti **`PGM` (Plant General Manager)**; posisi ditukar dengan OGM.
- BA PCR tetap memakai level **PLM** (Plant Manager).
- Migrasi: `npx tsx --env-file=.env.local scripts/approval/migrate-cannibal-plm-to-pgm.ts` lalu `npm run rbac:seed`.
- Jika PGM sudah APPROVED sementara OGM belum → PGM (dan OD/PD jika perlu) di-reset ke PENDING.

## 2026-08-06 — Cannibal approval: President Director (PD)

- Chain cannibal menambah **PD** setelah OD.
- Role `president_director` mendapat `cannibals.approve.PD` (+ `cannibals.access`).
- Backfill: `npx tsx scripts/approval/backfill-approval-level.ts --chain=CANNIBAL --level=PD`

## 2026-07-17 — Production Docker packaging (pre-deploy)

- Target produksi: Debian Docker Compose `/home/skyone/stack` (bukan XAMPP).
- App = Next.js container `arka-pcr` di `apps/app81/arka-pcr`; DB host `mysql` di `appnet`.
- Artefak: `Dockerfile` (runner + tools), `deploy/docker-compose.arka-pcr.snippet.yml`, `deploy/nginx/arka-pcr.conf`, `deploy/env.production.example`.
- Belum deploy ke server sampai user kirim akses SSH + bilang "deploy ke server" — lihat `docs/deployment-access-checklist.md`.
- Cutover data: remigrasi penuh dari dump legacy setelah freeze (staging Juni sudah stale).

## 2026-07-17 — Cannibal dashboard KPI recalculation

- Legacy BA often stays `OPEN` after L1–L3 APPROVED; also uses `CLOSE`/`CANCEL` instead of `CLOSED`/`CANCELLED`.
- Dashboard now classifies via `lib/dashboard/cannibal-status.ts`: fully-approved legacy OPEN → closed; CLOSE→closed; CANCEL→cancelled.
- In Approval excludes those legacy-complete OPEN rows so Total/In Approval are not inflated into the thousands.

## 2026-07-17 — Cannibal dashboard

- Route `/dashboard/cannibal` — pipeline KPI, status mix donut, Ach trend, volume chart, achievement table (project × posting month), approval backlog, recent active BA.
- API: `GET /api/dashboard/cannibal-stats?year=`, `GET /api/dashboard/cannibal-achievement?year=`.
- Ach%: Closed / Total BA (CANCELLED excluded); Open = non-closed active statuses.
- Nav: Dashboard group → PCR + Cannibal (`cannibals.access`).

## 2026-07-16 — Auto-generate: unique constraint `pcr_forecast_id_rep_key`

- Penyebab: forecast soft-deleted (sebelum fix unlink) masih menyimpan `id_rep`; auto-generate membuat forecast baru untuk unit+komponen yang sama dan mencoba `id_rep` yang sama → unique violation.
- Fix: `lib/forecasts/id-rep-link.ts` (`resolveLinkableIdRep`) — reclaim `id_rep` dari baris soft-deleted; skip link bila dipakai forecast aktif (mis. CLOSED). Dipakai di `createForecast`, `refreshForecastMetrics`, `generateForecasts`.

## 2026-07-16 — Hapus forecast: putus tautan WO + sembunyikan Delete setelah submit

- Soft-delete forecast (`deleteForecast` / `deleteAllForecastsForUnit`) sekarang juga set `idRep: null` agar replacement tidak lagi menampilkan link PCR Forecast ke forecast terhapus.
- Query replacement memfilter `forecast: { where: { deletedAt: null } }`; `mapReplacementLinkedForecast` mengabaikan baris dengan `deletedAt`.
- UI Delete forecast (grid + halaman detail) memakai `canDeleteForecastRow` — hanya OPEN + BA `PENDING`/`REJECTED`, selaras dengan server `canDeleteForecast`.

## 2026-07-16 — Friendly SAP error messages (Document Chain / drawer)

- Technical Node/network errors (e.g. `getaddrinfo ENOTFOUND arkasrv2`) were shown raw in SAP Document Chain & drawer.
- Added `lib/sap-b1/error-messages.ts` (`toFriendlySapErrorMessage`) — maps DNS, connection refused/reset, timeout, TLS, auth, and config errors to short English UI copy.
- Applied in `fetch.ts` / `session.ts`, API routes (`/api/sap/documents`, `/chain`, `/search`, `/materials`), and client `sap-document-utils.js` + Chain/Drawer catch handlers.
- **Bugfix**: client remapped friendly host message containing "host not found" via broad `includes('not found')` → showed "Document not found in SAP." Fix: exact/idempotent friendly set + narrower document-not-found match; rephrase to "hostname could not be resolved".
- Tests: `tests/lib/sap-b1/error-messages.test.ts`.

## 2026-07-16 — Kombinasi lead-time SAP ke rekomendasi PR — AI #8

- `scripts/capture-sap-lead-time.ts` — sisir `Replacement` dengan `prNo`+`poNo` terisi & belum pernah dicatat (`sapLeadTimeSample: null`), ambil `DocDate` PR/PO via `lib/sap-b1/documents-service.ts`, hitung `leadTimeDays = poDate - prDate`, simpan ke `sap_lead_time_sample` (unique per `idRep`, idempotent). `miDate` best-effort dari `getMisForWo` (tidak menggagalkan sample bila tidak ketemu). `npm run sap:capture-lead-time`.
- Dites terhadap data nyata: 2 replacement kandidat (prNo+poNo terisi), 1 berhasil di-capture (leadTimeDays=14, compType MID LIFE dari SAP asli), 1 skip (PR/PO dummy, tidak ada di SAP). Re-run kedua kali: idempotent (kandidat tersisa 1, tetap skip).
- `lib/sap-b1/lead-time.ts` (`getLeadTimeStatsForCompType`) — agregasi on-demand (avg + count) langsung dari `sap_lead_time_sample` per `compType`, tanpa tabel stat terpisah (sesuai rencana — sample masih sedikit di fase awal).
- `lib/calculations/rul.ts` (`applyLeadTimeRecommendation`) — tempel `recommendedProcurementDate = estimatedDate - avgLeadTimeDays` ke hasil `estimateRulByRegression`, hanya bila `sampleCount >= 5` (default threshold), supaya tidak menyesatkan saat data historis masih sedikit. Fungsi murni (tanpa I/O), dites dengan data sintetis di `tests/lib/calculations/rul.test.ts`.
- **Tidak dipersist** ke `pcr_forecast` (tidak ada migration baru) — dihitung on-the-fly hanya di `getForecastById` (`lib/forecasts/service.ts`, field `rulRecommendedProcurementDate`) untuk halaman detail forecast tunggal saja, supaya tidak menambah N+1 query di list/grid.
- UI: baris kecil "Rekomendasi mulai PR: <tanggal>" di tile "RUL Estimate (AI)" (`ForecastDetailSummary.js`) — hanya muncul jika data lead-time cukup.
- Verifikasi end-to-end lewat script sementara: dengan 5 sample compType (rata-rata 16 hari), `recommendedProcurementDate` terhitung benar (`estimatedDate - 16 hari`); kategori tanpa sample tetap `null`.

## 2026-07-16 — RUL by AI (regresi statistik) — AI #1

- `lib/calculations/rul.ts` (`estimateRulByRegression`) — regresi linear least-squares atas histori HM unit (window 12 bulan, fallback ke semua data jika < 3 titik dalam window). Return `null` bila data < 2 titik, slope <= 0 (HM tidak naik), atau komponen sudah overdue (`currentLife >= policy` — proyeksi mundur hanya menghasilkan tanggal masa lalu yang membingungkan; ditemukan lewat smoke test riil sebelum guard ditambah).
- Confidence range dari standard error slope (bukan interval prediksi penuh) — `n <= 2` → confidence null (variance residual tak terdefinisi).
- **Tidak menggantikan** `lifePercent`/Next Replacement Date — murni info tambahan, ditampilkan berdampingan.
- Kolom baru `pcr_forecast.rul_estimated_date/rul_confidence_low_date/rul_confidence_high_date/rul_method/rul_computed_at` — diisi di `buildForecastSnapshot` (`lib/forecasts/build-snapshot.ts`) via `getUnitHmReadingsForRul` (`lib/hour-meter/service.ts`, shared dengan `lib/replacement/component-detail.ts`); dipersist di `createForecast`/`refreshForecastMetrics`/`generateForecasts` (`lib/forecasts/service.ts`).
- Halaman detail Replacement (`getReplacementComponentDetail`) dan Forecast — field `rulEstimate`/`rul*` dihitung on-the-fly / disimpan, ditampilkan di `ForecastDetailSummary.js` (tile ke-5), `forecastGridColumns.js` (kolom baru setelah Life %), dan halaman detail replacement per unit (kolom setelah Next Replacement Date) — semua dengan tooltip "referensi tambahan, bukan pengganti".
- Verifikasi end-to-end: `refreshForecastMetrics` dites terhadap forecast nyata (`idForecast=11`, unit 104) — kolom `rul_*` tersimpan benar ke DB.

## 2026-08-12 — Debug & SAP admin cleanup

- **Forecast debug purge** dinonaktifkan: tombol Delete All (Debug), `DELETE /api/forecasts/debug/purge-all`, dan `purgeAllForecastsDebug` di-comment di `lib/forecasts/service.ts`.
- **SAP Integration admin** dihapus: `/admin/sap-integration`, `SapHealthBanner`, `scripts/sap-health-check.ts`, `scripts/reconcile-sap-pcr-status.ts`, API `health-status` / `reconciliation`, npm `sap:health-check` & `sap:reconcile`. Tabel `sap_health_check_log` / `sap_reconciliation_log` tetap. Ping manual: `npm run sap:ping` / `GET /api/sap/health`.

## 2026-07-16 — SAP B1 reliability (#1-#3, #5-#6)

- **Health check (#1)** *(UI/script dihapus 2026-08-12)*: dulu `scripts/sap-health-check.ts` → `sap_health_check_log`; banner + halaman admin. Sekarang: `npm run sap:ping` / `GET /api/sap/health`.
- **Cache (#2)**: `lib/sap-b1/cache.ts` — TTL 45s, module-level Map. Diterapkan di `fetchDocumentByDocNum` & `getSummaryForDoc` (`documents-service.ts`).
- **Kurangi N+1 (#3)**: `buildLaneForWo` fetch `getMisForWo` sekali per WO (bukan per MR); `buildPathsForMr` fetch `getPosForMr` sekali per MR (bukan per PR dalam loop). Test baru: `tests/lib/sap-b1/documents-service.test.ts` (call-count assertions), `tests/lib/sap-b1/cache.test.ts`.
- **Rekonsiliasi (#5)** *(UI/script dihapus 2026-08-12)*: dulu `scripts/reconcile-sap-pcr-status.ts` + halaman admin review. Tabel `sap_reconciliation_log` tetap di DB.
- **Stok (#6)**: Diverifikasi via `scripts/debug-sap-item-stock.ts` — `ItemWarehouseInfoCollection` **tidak didukung** di instance SAP ini; field valid: `QuantityOnStock`, `QuantityOrderedFromVendors`, `QuantityOrderedByCustomers` (scalar langsung di `Items`). `SapB1Material.onHand` baru; `SapMaterialAutocomplete` tampilkan stock per option (hijau/merah).
- Migration: `20260715160000_sap_reliability_logs_and_forecast_rul` (juga menyiapkan kolom `pcr_forecast.rul_*` untuk AI #1 — lihat entri terpisah). Diterapkan manual via `prisma db execute` + `migrate resolve --applied` karena shadow-DB `migrate dev` gagal replay pada migration historis `20260619100000` (index drop-before-create) — isu pra-eksisting, bukan dari perubahan ini.

## 2026-07-14 — Self-service change password

- User ganti password sendiri dari header dropdown (item **Change Password** di atas Sign Out).
- API `POST /api/auth/change-password` — `requireSession` saja (tanpa `users.access`); verifikasi `currentPassword` via bcrypt, hash baru cost 10, min 6 karakter.
- UI: `ChangePasswordDialog` + update `UserDropdown`. Admin tetap bisa set password lewat `PUT /api/users/[id]` tanpa current password.

## 2026-07-14 — Removed Cannibal by Posting Periode report

- Dihapus: `/reports/cannibals/period`, API `/api/cannibals/period-matrix`, `listCannibalPeriodMatrix`.
- Summary Cannibal (`/reports/cannibals`) tetap; tombol "By Posting Periode" dihapus.
- Alasan: matrix terlalu besar (~1.6k baris) sehingga halaman hang saat load.

## 2026-07-13 — Dashboard PCR + Achievement tahunan

- `/dashboard` refactored: 6 KPI, year selector, ApexCharts (Ach trend + Total/Close/Open), tabel Achievement PCR (Projek × Kategori × Jan–Dec + Grand Total Ach).
- `GET /api/dashboard/achievement?year=` — `pcr_forecast` groupBy projectCode × planPeriod × forecastStatus; Ach% = Close/Total; Grand Total weighted; YTD di response.
- Warna Ach: ≥80% green, 50–79% amber, &lt;50% red. Widgets di `src/views/pcr/dashboard/`.
- Stats API menambah `year`, `totals.pendingApprovals`; Open WO ditampilkan di KPI. Alias `/dashboards/maintenance` fixed ke dashboard PCR.

## 2026-07-13 — Forecast price matrix + independent model/component filters

- Halaman `/reports/forecasts/price` — pivot sum `priceComponent` (UI sama period matrix).
- Filter Model & Component di period + price berdiri sendiri (master models/components), tidak cascade dari Project.
- API `GET /api/forecasts/price-matrix`; period-matrix juga menerima `modelName` / `compDesc`.
- Hook `useForecastMatrixFilters` dipakai bersama period & price pages.

## 2026-07-13 — Cannibal reports (list)

- Halaman `/reports/cannibals` — summary BA (project, unit, posting month, status); link ke detail BA.
- Filter list diperluas: `postingDate` month, `fleetUnitId`, search unit/component/PN/model.
- Export `/api/exports/cannibals` kolom transfer (remove/install unit, component, PN, MR/PR/PO).
- Menu Reports → Cannibal.
- Period matrix dihapus 2026-07-14 (lihat entri di atas).

## 2026-07-10 — Forecast period matrix report

- Halaman baru `/reports/forecasts/period` — pivot jumlah forecast per Plan Periode (kolom bulan), baris Model Unit → Component.
- Filter: Site/Project + STATUS PCR (forecastStatus); default OPEN.
- API `GET /api/forecasts/period-matrix` via `listForecastPeriodMatrix` (Prisma groupBy).
- Akses dari tombol **By Plan Periode** di `/reports/forecasts` (tanpa item menu terpisah).
- Fix: `toPlanPeriodKey` pakai `toIsoDateOnly` — `String(Date)` bukan YYYY-MM-DD sehingga semua baris ter-skip.
- UI: sticky Model/Component seperti report forecast; layout tombol Detail list di bawah title.

## 2026-07-10 — PCR report aligned with forecast behavior

- **Sticky columns**: Model Unit, No Unit, Component (horizontal scroll + pinned left).
- **Kolom**: HM Component, Rep Date, WO Date, Life Time Component, Project, BA PCR, Status BA PCR, WO, STATUS WO, MR/PR/PO, REMARK, RETURN OLD COMP, SPB/BA RETURN OLD COMP; link ke unit/component, forecast, WO.
- **Filter**: Project, Unit, Component, Rep Date (month), Status; search termasuk model & BA PCR no.
- **Default sort**: `repDate DESC`, `unitNo ASC`.
- Export `/api/exports/pcr` selaras kolom grid (header bold tanpa warna).

## 2026-07-10 — Forecast report headers match spreadsheet

- **Kolom report forecast** mengikuti template Excel: Model Unit, No Unit, Component, HM Component, Policy, Life Time Component, Rating S.O.S, Price Component, Plan Periode (tahun), Bln, Quarter, BA PCR, Status BA PCR, Tanggal Pengajuan BA PCR, STATUS PCR, ACTION DATE PCR (hijau), PO, REMARK, RETURN OLD COMP (biru), SPB/BA RETURN OLD COMP.
- List forecast include `replacement` agar PO / return old core tersedia.
- Export `/api/exports/forecasts` selaras header yang sama.

## 2026-07-10 — Condition report filters & display

- **Kolom dipertahankan**: Project, Unit No, Component, Overall, Basis, SOS, FC, MPS, VI, TA2, ED, Evaluated.
- **Default sort**: `evaluatedAt DESC`, lalu `unitNo ASC`.
- **Filter**: Project, Unit, Component, Evaluated From/To, Overall, SOS Rating; search pada unit/component/overall/ratings.
- Export Excel mengikuti kolom & filter yang sama.

## 2026-07-10 — Inspection report columns & filters

- **Kolom**: Project → Inspection Date → Unit No → Component → Hour Meter → Inspection Type → Rating.
- **Default sort**: `insDate DESC`, lalu `unitNo ASC` (list + paginated + export).
- **Filter**: Project, Unit, Component, Inspection Date From/To, Type, Rating; search pada unit/component/type/rating/project.
- Pola sama dengan SOS report.

## 2026-07-10 — SOS report columns & filters

- **Kolom SOS report**: Project → Sample Date → Unit No → Component → Lab No → Evaluation Code.
- **Default sort**: `sampleDate DESC`, lalu `unitNo ASC` (list + paginated + export).
- **Filter**: Project, Unit, Component, Sample Date From/To, Evaluation Code; search pada unit/component/lab no/eval/project.
- **Export** `/api/exports/sos` mengikuti kolom & filter yang sama.

## 2026-07-10 — Reports API syntax fix

- **Bug**: `src/app/api/sos/route.ts` dan `conditions/route.ts` punya double comma `projectCode: ...,,` → SWC parse error `Unexpected token ','`.
- **Fix**: hapus comma ganda; restore import `getPrismaProjectFilter` di `lib/sos/service.ts` + `lib/condition/service.ts` (masih dipakai di get-by-id).

## 2026-07-09 — Reports refactor (server-side search + full columns)

- **Pattern**: Semua halaman `/reports/*` pakai `useReportPage` + `ReportTableHeader` + `reportGridColumns`.
- **Server-side**: Pagination/sort sudah server-side via `useServerDataGrid`; tambahan `search`/`q` di API list + export (`lib/utils/list-search.ts`, `appendSearchWhere` di tiap domain service).
- **Search fields**: PCR (unit, component, WO/MR/PR/PO), Forecast (unit, component, model, BA PCR no), Inspection (unit, component, type), SOS (unit, component, lab no/name, oil type, eval), Condition (unit, component, condition, SOS rating).
- **Kolom lengkap**: PCR + HM/WO date/MR/PR/PO; Forecast + model/HM/policy/CBM/plan period/BA no; Inspection + HM; SOS + type/lab/oil/hours; Condition full ratings (VI/TA2/ED/evaluatedAt).
- **HO**: filter project di toolbar bila user punya akses semua project (`hasAllProjectsAccess`).

## 2026-07-08 — Cannibal permissions consolidated

- **Plant ops** now use a single `cannibals.update` for: edit plant, send to logistics, execution/WO update, close, cancel.
- **Logistics** uses only `cannibals.update.logistic` (edit statement + promote/submit to approval). Deprecated: `cannibals.confirm.logistic`.
- **Deprecated / deactivated on seed**: `cannibals.submit`, `cannibals.submit.plant`, `cannibals.update.execution`, `cannibals.close`, `cannibals.cancel`, `cannibals.confirm.logistic`.
- **Kept separate**: `cannibals.access`, `cannibals.create`, `cannibals.update`, `cannibals.update.logistic`, `cannibals.approve.*`.
- After `npm run rbac:seed`, users must re-login so JWT permissions refresh.

## 2026-07-03 — Logistic Lead Time Part: total days input

- **Field baru**: `ba.logistic_lead_time_days` (INT NULL) — estimasi hari saat opsi Lead Time Part dipilih.
- **Validasi**: wajib diisi (angka positif) jika `logisticLeadTime` true; UI inline di radio "Lead Time Part (Est ___ days)".

## 2026-07-03 — Cannibal edit: unit no kosong di UI

- **Root cause**: Data unit di DB sudah benar (contoh BA `1927`: REMOVE `E 066`, INSTALL `E 067`), tetapi UI detail memakai `getSingleTransfer()` yang **tidak memetakan `unitNo`**, lalu `CannibalTransferDisplay` memprioritaskan objek `transfer` tanpa `unitNo` → tampil `—`.
- **Edit form**: MUI Select mismatch tipe `fleetUnitId` (number vs string) membuat dropdown unit tampak kosong meski ID ada.
- **Fix**: `mapSideFromLine` + normalisasi string `fleetUnitId`; `groupLinesToPairs` eksplisit sertakan `unitNo`/`fleetUnitId`; display merge `transfer` + `pairs`; Select pakai `String(eq.id)`.

## 2026-07-02 — SAP B1 P/N lookup (cannibal)

- **Integrasi**: SAP Business One 10 Service Layer (`/b1s/v2`) — entity `Items` untuk autocomplete P/N.
- **Modul**: `lib/sap-b1/*` — singleton `sapB1CookieJar` (setara Guzzle CookieJar Laravel), `ensureSession()`, auto re-login on 401; credential di `.env.local` only.
- **Dokumentasi**: [`docs/sap-b1-session-management.md`](docs/sap-b1-session-management.md) — ARKA PCR Next.js (bukan lagi copy Laravel mentah).
- **API**: `GET /api/sap/materials?q=` (auth required), `GET /api/sap/health` (ping + item groups discovery).
- **UI**: `SapMaterialAutocomplete.js` di `CannibalTransferForm` — pilih item → auto-fill `pn` + `compDesc`; freeSolo fallback manual jika SAP down.
- **Filter spare parts**: optional `SAP_B1_ITEM_GROUP_CODES` (comma-separated); kosong = semua item aktif.
- **Smoke test**: `npm run sap:ping` — dari dev PC timeout ke `192.168.32.26:50000` (perlu jaringan ke server SAP).

## 2026-06-24 — Cannibal UI single-component refactor

- **Satu komponen per BA** — hapus multi transfer pair di UI; validasi `pairs.length(1)`.
- **Komponen baru**: `CannibalTransferForm`, `CannibalTransferDisplay`, `CannibalSectionCard`, `cannibal-transfer-form.js`.
- **Dialog create/edit** — section cards, field komponen bersama (desc/PN/SN/POS), REMOVE ↔ INSTALL visual.
- **Detail** — hero komponen, transfer panel, aksi dikelompokkan.


- **Route**: `/dashboard` (`src/pages/dashboard/index.js`) — ringkasan PCR (stats, approval pending, komponen kritis).
- **Home setelah login**: `getHomeRoute`, `AuthContext`, `GuestGuard`, dan `/` redirect ke `/dashboard`.
- **Menu**: item Dashboard top-level (`auth: false`, visible semua user login); PCR Actual tetap di Reports.


- **Skema `ba`**: kolom Plant/Logistic justification (`plant_*`, `logistic_*`), attestation (`statement_requested_by/at`, `statement_confirmed_by/at`), FK ke `user`.
- **`kanibal.pair_index`**: pairing REMOVE+INSTALL per transfer; API payload `pairs[]` (flatten ke lines di service).
- **Workflow**: submit after logistic statement (`PUT .../logistic` or `POST .../confirm-statement` / `POST .../submit`) requires `cannibals.update.logistic` before approval chain PS→OD.
- **UI**: `CannibalDialog` layout form kertas; `CannibalJustificationDisplay`, `CannibalPairDisplay`; list pakai `useServerDataGrid` + modular columns/header/row handlers.
- **Backfill**: `npm run migrate:backfill-ba-justification` — heuristic RFU/NO STOCK + pair_index legacy.
- **List kosong**: API App Router pakai `getToken` (JWT) tanpa refresh jwt callback → `projectCodes`/`permissions` bisa stale. Fix: `hydrateSessionFromDb` di `requireSession` + `autoHeight` di DataGrid list.
- **BA No legacy**: `lib/cannibal/ba-number.ts` — format `{YY}52{projectKey}{seq}` (lanjut urutan migrasi); bukan `BA-{project}-{year}0001`.

## 2026-06-24 — Cannibal BA staged workflow

- **Alur (diperbarui 2026-08-10)**: Plant → Logistics (`PENDING_LOGISTICS`) → Record & Documentation (`PENDING_DOCUMENT`) → Approval PS→PD → Ready to Close (`APPROVED`) → Close.
- **API**: `POST .../submit-to-logistics`, `PUT .../logistic`, `PUT .../execution`, `POST .../submit`.
- **Permissions**: plant actions → `cannibals.update`; logistics → `cannibals.update.logistic`.
- **UI**: `CannibalWorkflowStepper`, dialog plant/logistic/planning/execution di `/cannibals/[id]`.

## 2026-06-24 — Semi-dark navigation theme

- **Mode default** `themeConfig.mode`: `semi-dark` — nav gelap, konten light (vertical & horizontal).
- **`NavThemeProvider`** (`src/@core/layouts/components/shared-components/NavThemeProvider.js`) membungkus sidebar, top app bar (vertical), dan horizontal AppBar + menu dengan `themeOptions(settings, 'dark')` hanya saat `mode === 'semi-dark'`.
- **Mode toggler** berganti `semi-dark` ↔ `dark` (bukan light ↔ dark). Full light/dark tetap lewat Customizer.
- **Catatan**: hapus `localStorage.settings` jika perubahan default mode tidak terlihat.

## 2026-06-19 — PCR Forecast schema redesign

- **Split** `ba_pcr` dari `pcr_forecast`; approval FK ke `id_ba_pcr`.
- **`id_rep`** di forecast nullable sejak create (history WO) atau setelah convert (komponen baru).
- **`converted_at`** mencegah double-convert; convert tidak membuat WO duplikat jika `id_rep` sudah ada.
- **Close forecast** normal: close WO + `replacement.po_no` wajib jika forecast ter-link.
- **Auto-generate**: life ≥ 100% atau CBM CRITICAL / rating X; premature manual via `remark`.
- **Migration**: `20260619100000_pcr_forecast_ba_pcr_redesign` (+ `migration_complete.sql` jika partial).

## 2026-09-02 — Subpath deploy `/arka-pcr`

- **URL produksi**: `http://192.168.32.146/arka-pcr/` (bukan root port 80).
- **Build**: `NEXT_PUBLIC_BASE_PATH=/arka-pcr` (Docker build-arg); `AUTH_URL` harus sama tanpa trailing slash.
- **Nginx**: upstream di `deploy/nginx/arka-pcr.conf`; routing `location /arka-pcr/` di `arka-pcr-site-locations.snippet` → masukkan ke `site.conf` utama agar app lain (`/app81/`, dll.) tetap jalan.
- **Client**: `src/utils/base-path.js` (`withBasePath`, `apiPath`); `fetch`/`window.open` ke API pakai helper ini; Next `Link`/`router` otomatis.
- **Upload**: semua upload pakai `arkaApi` → URL `/arka-pcr/api/.../`; `FormData` tidak boleh set `Content-Type` manual (interceptor `arka-api.js` menghapusnya). Volume `uploads` harus writable oleh uid **1001** (`chown 1001:1001` di host atau `docker compose exec -u root arka-pcr chown -R nextjs:nodejs /app/uploads`).
