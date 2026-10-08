# Rancangan tabel — Fundamental Maintenance Control

**Status**: Semua tabel di dokumen ini sudah dimigrasi (2026-10-05). `maintenance_plan_details`, kolom actual (tautan plan date, register no, status, QC, PIC, closed/updated), `maintenance_failures` + kode SAP + `pic_user_id`, `maintenance_failure_follows`, lampiran `MAINTENANCE_FAILURE`, `kpi_targets` (migrasi `20261005140000_unit_availability_kpi_targets`). `unit_availability_days` dihapus 2026-10-06. Yang belum: kartu dashboard yang membaca tabel ini.  
**Tanggal**: 2026-09-29 (diperbarui 2026-10-05)  
**Acuan**: User Manual & Technical Specification, Fundamental Maintenance Control Dashboard v1.0

Dashboard kontrol butuh satu baris per pekerjaan yang sudah due, plus temuan, kerusakan, ketersediaan unit, dan target KPI. Baris itu adalah `maintenance_actuals`. Tidak ada tabel `maintenance_jobs`.

PCR (`replacement`, `pcr_forecast`), BA kanibal, inspeksi komponen (`inspection`), SOS, dan `condition` tidak dipakai untuk kartu ini dan tidak diubah.

## Yang tidak disimpan

Umur backlog, status Overdue, persentase KPI, dan warna hijau/kuning/merah dihitung saat baca. Tidak ada tabel snapshot KPI.

Audit perubahan `plan_date` dan `closure_date` memakai `activity_log` yang sudah ada. Tidak ada kolom due date.

## Keputusan grain

Header plan tetap satu baris per site, tahun, bulan, dan program. Satu Plan Detail = satu unit, satu program, satu `plan_date`. Angka “washing 4 kali” adalah jumlah detail itu. `sum_plan` pada header menyimpan jumlah detail itu, atau kuota lama bila detail belum ada.

Masukan plan lewat impor Excel, pola yang sama dengan impor HM: site mengunduh format, mengisi unit, plan date, dan program, lalu mengunggah. Actual tetap diinput satu per satu.

## Perubahan `maintenance_plans` dan `maintenance_plan_details`

Header `maintenance_plans` unik pada `(project_id, year, month, maintenance_type_id)`. Unit dan tanggal tidak lagi di header.

| Kolom pada `maintenance_plan_details` | Tipe | Keterangan |
|---|---|---|
| `maintenance_plan_id` | string | Header bulan |
| `fleet_equipment_id` | int | Unit yang dijadwalkan |
| `plan_date` | date | Tanggal rencana. Lewat tanggal ini tanpa actual yang sama tanggalnya = overdue |
| `pending_reason` | varchar(500), null | Alasan baris plan tertunda (backlog). Diisi dari drill-down Backlog di dashboard control. Kosong = belum ada alasan |
| `pending_reason_updated_at` | datetime, null | Kapan alasan terakhir diubah |
| `pending_reason_updated_by` | int, null → `user.id_user` (SET NULL) | Siapa yang terakhir mengubah alasan |

Kolom `pending_reason*` ditambah migrasi `20261007090000_plan_detail_pending_reason` (2026-10-07). Perubahan alasan juga dicatat di activity log (`maintenance-plans`, event `updated`).

Unik detail: `(maintenance_plan_id, fleet_equipment_id, plan_date)`.

`due_date` dan `original_due_date` tidak dibuat. Hour meter rencana tidak disimpan. `hour_meter` tetap hanya di actual, sebagai HM saat kegiatan dilaksanakan. `sum_plan` pada header = jumlah detail.

Aturan:

- On time = Schedule adherence. Keduanya: actual dengan `maintenance_date` = `plan_date` ÷ seluruh plan detail pada periode × 100%.
- Overdue = detail yang tanggal pelaksanaannya tidak sama dengan `plan_date`, atau `plan_date` sudah lewat dan actual-nya belum ada, ÷ seluruh plan detail × 100%.
- Plan yang `plan_date`-nya masih di depan, dan belum punya actual, belum on time dan belum overdue.
- Actual yang telat tetap masuk pembilang PM Compliance. Compliance menghitung ketercapaian, bukan ketepatan tanggal.

## Perubahan `maintenance_actuals`

Kolom yang sudah ada dan tetap dipakai: `maintenance_plan_id`, `fleet_equipment_id`, `maintenance_date` (tanggal pelaksanaan), `hour_meter`, `mechanics`, `remarks`, `created_by`.

`maintenance_plan_detail_id` (null, unik) menautkan actual baru ke satu plan date. Actual telat tetap satu baris pada detail itu walaupun `maintenance_date` berbeda. Baris kuota lama dibiarkan null.

Satu actual tetap satu kali pelaksanaan. Tanggalnya `maintenance_date`. Tidak ada due date di sini.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `status` | OPEN, CLOSED, CANCELLED | Default CLOSED, karena actual baru disimpan saat sudah dilaksanakan. OPEN belum dipakai. Overdue tidak disimpan |
| `qc_status` | PASS, FAIL, NA, null | Null = belum dicek |
| `pic_user_id` | int, null | FK `user`. Bukan teks `mechanics` |
| `closed_at` | datetime, null | Diisi saat status menjadi CLOSED |
| `updated_at` | datetime | Diperbarui otomatis |

Kolom di atas dibuat lewat migrasi `20261005100000_maintenance_actual_status_qc`.

`maintenance_date` dan `hour_meter` tetap wajib saat actual disimpan. Actual baru ada ketika pelaksanaan diinput.

Index: `(maintenance_plan_id, status)`, `(fleet_equipment_id, status)`, `(pic_user_id)`.

Aturan tulis:

- Actual disimpan saat pelaksanaan diinput, dengan `maintenance_date` dan `hour_meter` terisi, status `CLOSED`.
- Jadwal yang belum dikerjakan adalah baris plan tanpa actual, bukan baris actual kosong.
- `CANCELLED` tidak dihitung pelaksanaan dan tidak menambah pembilang compliance.
- Edit actual boleh mengubah status ke CLOSED atau CANCELLED. CLOSED mengisi `closed_at` dengan waktu simpan; CANCELLED mengosongkannya.

Baris yang sudah ada saat migrasi diisi `status = CLOSED` dan `closed_at = maintenance_date`.

### `maintenance_failures`

Satu tabel untuk temuan dan kerusakan. Tidak ada `maintenance_findings` dan tidak ada master `failure_codes` lokal.

Kode failure diambil dari Service Layer, bukan dari service call. Component dari UDO `MIS_COMPONENTNO`, sub component dari baris `MIS_COMPONENTNOLCollection` (`U_MIS_CompNoLine`), damage dari UDO `MIS_DAMAGE`. Nama disalin saat simpan. `sap_failure_code` tetap untuk baris lama dan tidak diisi lagi.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | cuid | |
| `sap_failure_code` | varchar(30), null | Kode lama. Tidak diisi lagi |
| `component_code`, `component_name` | varchar(50), varchar(100), null | `MIS_COMPONENTNO` |
| `sub_component_code`, `sub_component_name` | varchar(50), varchar(100), null | Baris `MIS_COMPONENTNOL` pada component itu |
| `damage_code`, `damage_name` | varchar(50), varchar(100), null | `MIS_DAMAGE` |
| `project_id` | varchar(10) | Site saat kejadian |
| `fleet_equipment_id` | int | Unit |
| `maintenance_actual_id` | cuid, null | Actual terkait, kalau ada |
| `severity` | CRITICAL, MAJOR, MINOR | |
| `description` | text | Uraian |
| `occurred_at` | datetime | Saat kejadian |
| `closure_date` | date, null | Null = masih terbuka |
| `pic_user_id` | int, null | FK `user` |
| `operating_hours` | decimal(12,2), null | Salinan HM unit pada saat kejadian |
| `created_by` | int | |
| `created_at`, `updated_at` | datetime | |

Index: `(project_id, occurred_at)`, `(fleet_equipment_id, occurred_at)`, `(severity, closure_date)`. `sap_failure_code` tidak masuk index karena tidak diisi lagi.

`pic_user_id` dipilih di kartu temuan form actual (temuan baru dan temuan yang dicatat di actual ini), dari daftar yang sama dengan PIC actual. Index `maintenance_failures_pic_idx`, FK `ON DELETE SET NULL`.

`operating_hours` diisi dari `hm` pada tanggal kejadian.

Downtime tidak disimpan. Nilainya dihitung: jam dari `occurred_at` sampai `closure_date`, atau sampai sekarang bila masih terbuka. Keduanya dibaca sebagai awal hari lokal, jadi hasilnya kelipatan 24 jam. Downtime tidak dijumlahkan ke ketersediaan harian.

Critical backlog = failure `CRITICAL` yang `closure_date`-nya masih null pada actual yang plan-nya sudah lewat `plan_date`.

Foto temuan memakai `attachments` yang sudah ada. `AttachmentEntityType` bertambah `MAINTENANCE_FAILURE`, `entity_id` = id failure. Satu failure boleh punya banyak foto.

### `maintenance_failure_follows`

Satu baris tiap kali actual berikutnya pada unit yang sama berhadapan dengan failure yang masih terbuka.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | cuid | |
| `maintenance_failure_id` | cuid | FK failure yang masih terbuka |
| `maintenance_actual_id` | cuid | Actual yang sedang diinput, misalnya greasing besoknya |
| `progressed` | boolean | True = pada actual ini ada progres menuju tutup. False = belum diprogres. Keduanya tetap menambah frequency selama failure belum ditutup |
| `created_at` | datetime | |

Unik: `(maintenance_failure_id, maintenance_actual_id)`.

Frequency tidak disimpan. Nilainya `1 + jumlah follow` failure itu. Follow hanya dibuat untuk actual berikutnya selama `closure_date` masih kosong.

Contoh: inspeksi mencatat hose leak. Satu failure, frequency 1, masih terbuka. Besok greasing menemukan failure itu belum diprogres: satu follow, frequency 2. Failure yang sama masuk repeat finding. Kalau diprogres tetapi belum ditutup, lalu actual berikutnya datang dan closure masih kosong, frequency bertambah lagi. Actual setelah `closure_date` terisi tidak menambah frequency.

### ~~`unit_availability_days`~~ (dihapus 2026-10-06)

Tabel input harian planned/downtime per unit dihapus lewat migrasi `20261006120000_drop_unit_availability_days`. PA sekarang = jam kalender periode × unit ACTIVE − downtime temuan failure (lihat `docs/fms-control-dashboard-implementation.md`). Ke depan downtime akan diambil dari seluruh breakdown unit (`docs/backlog.md`).

### `kpi_targets`

Target dan ambang warna. Boleh per site dan per program.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | cuid | |
| `kpi_code` | varchar(40) | Kode kartu, daftar di bawah |
| `project_id` | varchar(10) | `*` = semua site |
| `maintenance_type_id` | varchar(30) | `*` = semua program. Bukan FK saat bernilai `*` |
| `target_value` | decimal(10,2) | Ambang hijau |
| `direction` | HIGHER, LOWER, COUNT_ZERO | Arah baik |
| `yellow_margin` | decimal(10,2) | Jarak zona kuning, satuan sama dengan target |
| `effective_from` | date | Berlaku mulai tanggal ini |
| `created_at`, `updated_at` | datetime | |

Unik: `(kpi_code, project_id, maintenance_type_id, effective_from)`.

`*` dipakai sebagai pengganti null supaya unik MySQL benar-benar menolak dobel. Null di unik MySQL tidak saling bentrok.

Urutan pakai: site+program, lalu site saja, lalu program saja, lalu `*`/`*`. Yang diambil adalah baris dengan `effective_from` paling akhir yang masih ≤ akhir periode.

`COUNT_ZERO` juga memakai `yellow_margin` (sejak 2026-10-07): hijau ≤ target, kuning ≤ target + margin, merah di atasnya. Default spec bagian 11 = margin 1 (hijau 0, kuning 1, merah > 1). Migrasi `20261007120000_kpi_target_count_zero_margin` mengubah baris COUNT_ZERO yang margin-nya 0 menjadi 1 supaya warna lama tidak berubah. Margin 0 = langsung merah di atas target.

Kode awal: `PM_COMPLIANCE`, `ON_TIME_COMPLIANCE`, `SCHEDULE_ADHERENCE`, `OVERDUE_MAINTENANCE`, `TOTAL_BACKLOG`, `BACKLOG_GT30`, `QC_PASS_RATE`, `FAILURE_CLOSURE`, `CRITICAL_FAILURE`, `CRITICAL_BACKLOG` (ditambah 2026-10-06), `PA_AVAILABILITY`, `MTBF`, `MTTR`, `REPEAT_FAILURE`, `FAILURE_FREQUENCY`.

Yang dibangun: 12 kode di `KPI_DEFINITIONS` (`lib/fms/kpi-targets.ts`). `TOTAL_BACKLOG` dan `FAILURE_FREQUENCY` tidak dipakai karena spesifikasi tidak memberi target. Migrasi mengisi satu baris `*`/`*` per kode, berlaku 2026-01-01: target dari spesifikasi bagian 6, margin kuning 5 poin (HIGHER %), 10 poin (LOWER %), MTTR 1,2 jam, MTBF 3 jam. Admin mengubahnya di **System → KPI Targets** (`/admin/kpi-targets`). Kartu memakai `resolveKpiTarget()` lalu `kpiStatusColor()`.

### `api_tokens` (2026-10-07)

Token untuk aplikasi lain yang memanggil `/api/v1/fms/*` (spec bagian 17). Token bertindak sebagai user pemiliknya. Migrasi `20261007140000_api_tokens`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | cuid | |
| `user_id` | int, FK `user.id_user` (cascade) | User yang "dipinjam": scope site + permission |
| `name` | varchar(100) | Aplikasi pemakai |
| `token_prefix` | varchar(16) | 12 karakter awal token (`arka_…`), untuk mengenali token di daftar |
| `token_hash` | char(64), unik | SHA-256 token; token asli tidak disimpan |
| `expires_at` | datetime, null | null = tidak kedaluwarsa |
| `last_used_at`, `last_used_ip` | datetime / varchar(45), null | Diperbarui paling sering sekali per menit (atau saat IP berubah) |
| `revoked_at` | datetime, null | Terisi = token ditolak; baris tetap untuk audit |
| `created_by_id` | int, FK `user.id_user` (set null), null | Admin pembuat |
| `created_at`, `updated_at` | datetime | |

## Rumus yang dikunci oleh kolom ini

Penyebut = jumlah baris plan pada periode. Tiga kartu yang dikunci percakapan 29 Sep 2026:

| Kartu | Rumus |
|---|---|
| PM Compliance | Actual yang terlaksana ÷ jumlah baris plan |
| On-Time | Sama dengan Schedule Adherence |
| Overdue | Baris plan yang tanggal pelaksanaannya tidak sama dengan `plan_date`, atau `plan_date` sudah lewat tanpa actual ÷ jumlah baris plan × 100% |
| Schedule Adherence | Baris plan yang `maintenance_date` actual-nya = `plan_date` ÷ seluruh baris plan pada periode × 100% |
| QC Pass Rate | Actual pada plan periode itu dengan `qc_status = PASS` ÷ actual yang `qc_status` PASS atau FAIL. NA dan null tidak masuk |
| Failure Closure | Failure pada periode itu dengan `closure_date` terisi ÷ semua failure pada periode itu |
| Critical Failure | Failure CRITICAL pada periode itu yang `closure_date` masih null. Umur dari `occurred_at` |
| MTBF | Kenaikan HM unit pada periode (dari tabel `hm`) ÷ jumlah failure. `operating_hours` hanya salinan HM saat kejadian, untuk drill-down |
| MTTR | Jumlah jam (`closure_date` − `occurred_at`) failure yang ditutup pada periode itu ÷ jumlah failure tersebut. Semua severity. Failure terbuka tidak masuk |
| PA | (jam kalender periode × unit ACTIVE − downtime temuan) ÷ (jam kalender periode × unit ACTIVE) |
| Repeat Finding | Failure yang frequency-nya lebih dari 1 ÷ seluruh failure pada periode. Frequency = 1 + jumlah follow selama belum ditutup |
| Program Achievement | PM Compliance dikelompokkan lewat `maintenance_plans.maintenance_type_id` |

`maintenance_date` dibandingkan sebagai tanggal kalender.

## Relasi

```text
maintenance_types
    └── maintenance_plans (site, bulan, program)
            ├── maintenance_plan_details (unit + plan date)
            └── maintenance_actuals
                    └── maintenance_failures (opsional, boleh tanpa actual)
                            ├── maintenance_failure_follows
                            └── attachments (entity MAINTENANCE_FAILURE)
fleet_equipment_cache (unit ACTIVE → penyebut PA)
kpi_targets (berdiri sendiri)
```

## Di luar rancangan ini

- Tabel checklist QC per baris cek. Kartu QC hanya butuh `qc_status`.
- Mengisi PA otomatis dari downtime failure.
- Mengubah `sum_plan` menjadi jumlah baris actual.
- Menyimpan hasil hitung KPI.
