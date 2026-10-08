# Rencana pengembangan — Fundamental Maintenance Control

**Status** (2026-10-05): Fase 1, 2, 5, 6 selesai. Fase 4 skema + form selesai, kartu QC menunggu Fase 3. Fase 7 dan 8: tabel, input, dan resolver selesai, kartu belum. Fase 3 belum.  
**Tanggal**: 2026-09-29  
**Skema**: `docs/fms-control-dashboard-schema.md`

Urutan ini mengikuti yang sudah dikunci: satu baris plan = satu unit + satu program + satu `plan_date`, tanpa due date, tanpa HM rencana. Actual tetap diinput satu per satu. Temuan dan kerusakan satu tabel `maintenance_failures`. Kode failure menyusul dari SAP.

Yang dipakai site lebih dulu adalah empat angka: PM Compliance, Schedule Adherence, On Time, dan Overdue. On Time sama dengan Schedule Adherence. Kartu QC, failure, PA, dan MTBF menyusul setelah angka tanggalnya bisa dicocokkan dengan Excel.

## Yang tetap hidup selama transisi

`/dashboards/maintenance` sekarang membaca `sum_plan` dan jumlah actual (`lib/fms/dashboard/achievement.ts`, `GET /api/dashboard/achievement`, `GET /api/dashboard/stats`). Widget berjudul Overdue di layar itu adalah sisa kuota (plan − actual), bukan lewat `plan_date`.

Baris plan lama (site + bulan + program + `sum_plan`, tanpa unit dan tanpa tanggal) tidak dihapus di fase pertama. Achievement, email ketercapaian, dan laporan bulanan tetap memakai baris itu sampai sebuah site punya baris bertanggal untuk program yang sama.

KPI baru hanya menghitung baris yang `plan_date`-nya terisi.

## Fase 1 — Plan per unit, lewat Excel

**Selesai bila** site bisa mengunduh template, mengisi unit + plan date + program, mengunggah, dan melihat daftar jadwal itu. Sistem menghitung “unit A, washing 4 kali” dari jumlah baris.

Perubahan data (seperti yang dibangun):

- Header `maintenance_plans` tetap unik per `(project_id, year, month, maintenance_type_id)`.
- Unit dan tanggal ada di `maintenance_plan_details`, unik `(maintenance_plan_id, fleet_equipment_id, plan_date)`.
- `sum_plan` = jumlah detail, atau kuota lama bila header belum punya detail.

Input lewat grid unit × tanggal (`/maintenance-plans/add`, `/edit`) atau impor Excel dengan kolom Project, Year, Month, Unit, Plan Date, Maintenance Type (`POST /api/maintenance-plans/import`).

## Fase 2 — Actual menempel ke satu jadwal

**Selesai bila** input actual memilih satu baris plan (unit + program + tanggal), dan tanggal pelaksanaan tersimpan di `maintenance_date` seperti sekarang.

`maintenance_plan_id` sudah ada. Form actual (`/maintenance-actuals/add`) memuat pilihan jadwal yang belum punya actual untuk unit itu, bukan kuota bulan.

Sebelas actual yang sudah ada tetap menempel ke baris lama. Mereka masuk achievement lama, dan belum masuk kartu tanggal sampai dihubungkan ke baris yang punya `plan_date`.

`maintenance_date` dan `hour_meter` tetap wajib. Jadwal yang belum dikerjakan adalah plan tanpa actual.

## Fase 3 — Empat kartu di dashboard yang ada

**Selesai bila** filter site dan periode di `/dashboards/maintenance` mengubah empat angka ini, dan tiap angka bisa dibuka sampai daftar unit.

| Kartu | Rumus |
|---|---|
| PM Compliance | Actual terlaksana ÷ jumlah baris plan bertanggal pada periode × 100% |
| Schedule Adherence | Actual dengan `maintenance_date` = `plan_date` ÷ jumlah baris plan itu × 100% |
| On Time | Sama dengan Schedule Adherence |
| Overdue | Tanggal pelaksanaan beda dari `plan_date`, atau `plan_date` sudah lewat tanpa actual ÷ jumlah baris plan × 100% |

Plan yang tanggalnya masih di depan masuk penyebut adherence, dan belum masuk overdue. Actual yang telat tetap masuk pembilang compliance.

Widget Remaining yang sekarang tidak diganti diam-diam. Kartu Overdue yang baru adalah kartu terpisah, dengan arti lewat `plan_date`.

Hitungan ada di helper baru, dibaca dashboard. Tidak ada tabel snapshot KPI. Achievement `sum_plan` dan email Jumat tidak diubah di fase ini.

Daftar drill-down: unit, program, `plan_date`, `maintenance_date`, dan label on time / overdue / belum jatuh tempo.

## Fase 4 — QC pada actual

**Selesai bila** actual yang sudah `CLOSED` bisa diisi `qc_status` (PASS, FAIL, NA) dan QC Pass Rate tampil dengan filter yang sama.

Kolom: `qc_status`, `pic_user_id`, `closed_at`, `updated_at`, `status`. Actual baru langsung `CLOSED` karena baru disimpan saat dilaksanakan. NA dan kosong tidak masuk penyebut QC.

Sudah dikerjakan (2026-10-05): migrasi `20261005100000_maintenance_actual_status_qc`, form actual (PIC, QC status, Status di edit), list dan detail actual. Kartu QC Pass Rate menyusul bersama kartu Fase 3.

## Fase 5 — Failure, tanpa menunggu kode SAP

**Selesai bila** sebuah failure bisa dicatat (dari actual atau berdiri sendiri), ditutup, dan tiga angka ini tampil: Failure Closure, Critical Failure yang masih terbuka, Repeat Failure.

Tabel `maintenance_failures` sesuai skema. Satu defect tetap satu baris. `maintenance_failure_follows` mencatat setiap actual berikutnya selama belum ditutup. Frequency = 1 + jumlah follow. Repeat finding = frequency lebih dari 1. `sap_failure_code` boleh kosong. Progres tanpa closure tidak menghentikan kenaikan frequency.

`operating_hours` boleh kosong. Downtime dihitung dari `occurred_at` sampai `closure_date` (atau sekarang bila terbuka), tidak disimpan. MTTR dan MTBF belum dihitung.

## Fase 6 — Kode failure dari SAP

**Selesai bila** temuan menyimpan component, sub component, dan damage dari SAP.

Sumbernya UDO `MIS_COMPONENTNO`, baris `MIS_COMPONENTNOLCollection`, dan UDO `MIS_DAMAGE`. Form actual memilih ketiganya. Server menyalin kode dan nama saat simpan. Dashboard Maintenance Control menampilkan Top 10 issue (komponen — damage) per periode.

## Fase 7 — PA, MTBF, MTTR

**Selesai bila** PA memakai jam kalender periode × unit ACTIVE dikurangi downtime temuan, MTTR memakai rata-rata jam `occurred_at` sampai `closure_date` pada failure yang ditutup di periode itu (semua severity), dan MTBF memakai kenaikan `hm` dibagi jumlah failure.

Sudah dikerjakan (2026-10-06): kartu PA, MTBF, MTTR di dashboard Maintenance Control. Input harian Units → Availability (`unit_availability_days`) sempat dibuat 2026-10-05 lalu dihapus. Ke depan downtime PA diambil dari seluruh breakdown unit, bukan hanya temuan maintenance (`docs/backlog.md`).

## Fase 8 — Target dan warna

**Selesai bila** admin mengubah target per kartu, per site, dan per program, tanpa ubah kode, dan warna kartu mengikuti `kpi_targets`.

Ambang awal dari spesifikasi hanya sebagai data awal, bukan angka yang dikunci di frontend.

Sudah dikerjakan (2026-10-05): tabel `kpi_targets` + 12 target awal, halaman **System → KPI Targets**, API `/api/kpi-targets`, permission `kpi-target.*` (tier system, hanya administrator secara default), `resolveKpiTarget()` dan `kpiStatusColor()` di `lib/fms/kpi-targets.ts`. Perubahan target tercatat di activity log (`kpi-targets`). Pewarnaan kartu menunggu kartunya.

## Di luar rencana ini

- Due date dan HM pada plan.
- Tabel temuan terpisah, atau master kode failure buatan sendiri.
- Checklist QC per baris cek.
- Menyimpan hasil persen KPI.
- Mengubah PCR, BA kanibal, inspeksi komponen, dan SOS.
