# Rencana implementasi — Plan, Actual, Dashboard Maintenance

**Status**: Plan dan tautan actual ke plan date selesai (2026-09-30). Dashboard Maintenance Control dibangun sebagai halaman terpisah (2026-10-05), lihat bagian di bawah.  
**Tanggal**: 2026-09-29  
**Skema**: `docs/fms-control-dashboard-schema.md`

Ujung irisan ini adalah tiga kartu di `/dashboards/maintenance`: PM Compliance, Schedule Adherence (sama dengan On Time), dan Overdue. Sumbernya hanya baris plan bertanggal dan actual yang menempel ke baris itu.

Di luar tiga kartu ini: kartu PA (sejak 2026-10-06 dari jam kalender × unit aktif dikurangi downtime temuan, tabel `unit_availability_days` sudah dihapus), QC, dan kartu reliability. Warna kartu memakai `resolveKpiTarget()` + `kpiStatusColor()` dari `lib/fms/kpi-targets.ts`. Temuan terbuka saat actual ada di bagian berikutnya.

## Kondisi sekarang

- `maintenance_plans` unik per site + tahun + bulan + program. Tanggal per unit ada di `maintenance_plan_details`. Ada 51 header kuota lama tanpa detail.
- `maintenance_actuals` wajib punya plan, unit, tanggal, dan hour meter. Actual baru wajib menempel ke satu `maintenance_plan_detail`. Baris lama yang menempel ke kuota bulan tetap `maintenance_plan_detail_id` null.
- Input plan: halaman `/maintenance-plans/add`, `/edit`, dan `/view`. Setelah project, tahun, bulan, dan program, Generate menampilkan unit × tanggal bulan itu. Centang disimpan lewat `POST /api/maintenance-plans/schedule`.
- Export dan impor memakai kolom yang sama: Project, Year, Month, Unit, Plan Date, Maintenance Type. Satu baris Excel = satu tanggal unit. Site, tahun, dan bulan diisi ulang dari unit dan plan date. Header kuota tanpa detail tidak ikut file.
- Angka dashboard dan email Jumat sama-sama memakai `sum_plan`: `lib/fms/dashboard/stats.ts` dan `lib/fms/dashboard/achievement.ts`.

51 baris lama tidak dipecah menjadi tanggal palsu. Baris tanpa `plan_date` tidak masuk tiga kartu baru.

## Rumus yang dipakai kartu

Penyebut = baris plan yang `plan_date`-nya terisi, di site dan periode yang dipilih.

| Kartu | Pembilang |
|---|---|
| PM Compliance | Baris plan yang punya actual dengan status bukan `CANCELLED` |
| Schedule Adherence dan On Time | Baris plan yang `maintenance_date` actual-nya sama dengan `plan_date` |
| Overdue | Baris plan yang tanggal actual-nya beda, atau `plan_date` sudah lewat dan actual belum ada |

Plan yang tanggalnya masih di depan masuk penyebut adherence, dan belum masuk overdue. Actual yang telat tetap masuk pembilang compliance.

Actual `CANCELLED` diperlakukan seperti belum ada actual: tidak masuk compliance atau adherence, dan masuk overdue bila `plan_date` sudah lewat.

## 1. Skema (seperti yang dibangun)

Header `maintenance_plans` tetap unik per site + tahun + bulan + program. Unit dan `plan_date` ada di `maintenance_plan_details`, unik per header + unit + tanggal. Empat tanggal washing = empat detail di bawah satu header.

`maintenance_actuals.maintenance_plan_detail_id` menautkan actual ke satu detail. Tanggal pelaksanaan yang dipakai kartu adalah `maintenance_date`. Kolom `status` (2026-10-05) dipakai agar actual `CANCELLED` tidak masuk pembilang compliance.

## 2. Impor dan daftar plan

Ganti format Excel di `src/pages/maintenance-plans/index.js`.

Kolom template: Project, Year, Month, Unit, Plan Date, Maintenance Type. File export memakai kolom itu dan bisa diimpor ulang. Site diambil dari `project_code` unit di `fleet_equipment_cache` dan dicek terhadap kolom Project. Tahun dan bulan diambil dari plan date.

`importMaintenancePlans` di `lib/fms/maintenance-plans.ts` melakukan upsert pada unik unit + program + plan date. Program dicocokkan ke `maintenance_types.name`.

Daftar plan menampilkan unit, program, plan date, dan ada atau tidaknya actual. Drawer tambah/edit (`AddMaintenancePlanDrawer.js`, `EditMaintenancePlanDrawer.js`) memakai ketiga field itu, bukan total plan.

## 3. Actual menempel ke satu baris plan

Form actual (`src/pages/maintenance-actuals/add`, `edit`, dan dialog di unit) memilih satu plan date: unit + program + tanggal. `createMaintenanceActual` menolak simpan tanpa `maintenance_plan_detail_id`, dan menolak actual kedua pada detail yang sama. Tanggal pelaksanaan tetap `maintenance_date` dan boleh beda dari plan date.

11 actual yang sudah menempel ke kuota lama dibiarkan tanpa detail. Mereka tidak masuk on time atau overdue. Edit actual itu boleh menyimpan HM tanpa menautkan tanggal, atau memilih plan date untuk menautkannya.

## 4. Hitung KPI

Satu fungsi baru, misalnya `getMaintenanceControl` di `lib/fms/dashboard/`, memakai filter site, tahun, dan bulan atau YTD. Fungsi itu mengembalikan tiga persen plus daftar baris plan di baliknya (unit, program, plan date, tanggal actual).

`getFmsDashboardStats` dan `getFmsAchievement` beralih ke hitungan baris bertanggal untuk angka yang tampil. Email Jumat (`lib/fms/dashboard/achievement-digest.ts`) memakai fungsi yang sama, supaya angka email dan layar tidak beda.

## 5. Dashboard

Halaman tetap `src/pages/dashboards/maintenance/index.js`.

Tiga kartu di atas tab yang ada:

- PM Compliance, dari pembilang ketercapaian
- Schedule Adherence, label yang sama dipakai untuk On Time
- Overdue

Widget yang sekarang (`WidgetCompliance.js` sebenarnya Total Actual, `WidgetOverdue.js` sebenarnya sisa kuota) tidak dipakai lagi untuk arti tanggal. Tab achievement tetap ada, penyebutnya menjadi jumlah baris plan bertanggal, bukan `sum_plan`.

Filter site dan tahun/bulan yang sudah ada di tab achievement mengubah ketiga kartu sekaligus.

## Selesai kalau

- Impor empat baris washing untuk satu unit pada empat tanggal menghasilkan hitungan 4, bukan satu kuota.
- Actual pada plan date masuk compliance dan adherence, tidak masuk overdue.
- Actual di tanggal lain masuk compliance dan overdue, tidak masuk adherence.
- Plan date yang sudah lewat tanpa actual masuk overdue, tidak masuk compliance.
- Plan date yang masih di depan tanpa actual hanya masuk penyebut adherence.
- 51 kuota lama tidak memunculkan overdue.
- Angka kartu bisa dicocokkan dengan daftar baris plan pada filter yang sama.
- Email achievement memakai angka yang sama dengan dashboard.

## Dashboard Maintenance Control (dibangun 2026-10-05)

Halaman baru `/dashboards/maintenance-control` mengikuti rancangan "Fundamental Maintenance Control". Dashboard lama `/dashboards/maintenance` tidak diubah.

- Service: `getMaintenanceControl(session, { year, month, mode, projectId, programId })` di `lib/fms/dashboard/control.ts`.
- API: `GET /api/dashboard/maintenance-control?year=&month=&mode=MTD|YTD&projectId=&programId=` (izin `maintenance-dashboard.read`, site dibatasi `resolveProjectFilter`).
- UI: `src/pages/dashboards/maintenance-control/index.js` + `src/views/dashboards/maintenance-control/` (`shared.js`, `FilterBar.js`, `KpiCards.js`, `ControlCharts.js`, `ControlTables.js`, `DrilldownDialog.js`, `ReportActions.js`) + halaman cetak `src/pages/dashboards/maintenance-control/print.js`.
- Menu: Dashboard → Maintenance Control.

Filter global (spec bagian 5), semuanya mengubah seluruh kartu, chart, dan tabel:

| Filter | Nilai | Efek |
|---|---|---|
| Period | bulan (tombol ‹ › geser satu bulan) | akhir periode dan cut-off |
| View | MTD / YTD | MTD = bulan terpilih; YTD = 1 Jan s/d akhir bulan terpilih |
| Site | All / site | plan, temuan, unit ACTIVE (PA), hm (MTBF), target per site |
| Program | All / Washing / Greasing / Track Cleaning / PPU/CTS / Inspection (dari `maintenance_types`) | baris plan dengan tipe itu; temuan dari actual tipe itu; PA hanya downtime temuan program itu; target program dipakai bila ada. Repeat failure tetap melihat riwayat semua program |

Filter disimpan di URL (`?period=2026-10&view=YTD&site=017C&program=<id>`) sehingga tampilan bisa dibagikan. Klik program di donut atau baris tabel Program Performance Detail = filter program; klik lagi = kembali ke semua. Baris ringkasan di filter bar menampilkan rentang tanggal yang dihitung dan cut-off. Diverifikasi 2026-10-06: jumlah plan (1.247), temuan (94), dan backlog (85) per program sama dengan total All Programs.

Periode: MTD = bulan terpilih, YTD = 1 Januari s/d akhir bulan terpilih. Cut-off = min(akhir periode, hari ini). Bulan setelah hari ini tidak dihitung di tren.

Untuk data demo lokal, env `FMS_DASHBOARD_TODAY=YYYY-MM-DD` menggeser "hari ini" (mis. `2026-12-31` agar setahun penuh terlihat). Variabel ini diabaikan bila `NODE_ENV=production`.

Setiap KPI punya dua tanda:

1. **Status target** (warna titik): hijau = tercapai, kuning = mendekati, merah = belum, abu = monitor (tanpa target). Dihitung `resolveKpiTarget` + `kpiStatusColor`.
2. **Kesiapan data**: Live, No data yet (rumus ada, data belum diinput), Not built yet (rumus belum bisa dibuat). Strip di atas halaman menghitung berapa KPI yang sudah punya data.

Rumus seperti dibangun (hanya baris plan bertanggal; actual `CANCELLED` = tidak ada actual):

| KPI | Rumus |
|---|---|
| PM Compliance | baris plan yang punya actual ÷ baris plan di periode |
| On-Time Compliance | actual ≤ plan date ÷ baris plan yang sudah jatuh tempo (plan date ≤ cut-off) |
| Schedule Adherence | actual = plan date ÷ baris plan di periode |
| Overdue Maintenance | (actual telat, atau belum ada actual dan plan date < cut-off) ÷ baris jatuh tempo |
| Backlog (total & aging) | plan date ≤ cut-off tanpa actual ≤ cut-off; umur 0–7 / 8–14 / 15–30 / >30 hari |
| Critical Backlog | temuan CRITICAL yang belum closed pada cut-off dan sudah lewat due date. Due date = tanggal temuan (lewat mulai hari berikutnya). Aging = cut-off − due date (bucket 0–7 / 8–14 / 15–30 / >30, tooltip di panel Backlog Aging). Target `CRITICAL_BACKLOG` = 0 (COUNT_ZERO) |
| QC Pass Rate | PASS ÷ (PASS + FAIL) pada actual di periode |
| Repeat Finding | temuan dengan follow > 0 ÷ temuan di periode |
| Failure Closure | temuan yang ditutup ≤ cut-off ÷ temuan di periode |
| Critical Finding | temuan CRITICAL yang masih terbuka di cut-off |
| PA | (jam kalender periode × unit − downtime) ÷ (jam kalender periode × unit). Unit = unit ACTIVE di `fleet_equipment_cache` site itu + unit lain yang punya downtime. Downtime = hari temuan failure (finding date → closure date; open → cut-off), dipotong ke periode, temuan yang tumpang tindih di satu unit digabung |
| MTTR | rata-rata (closure − occurred) × 24 jam, temuan yang ditutup di periode |
| MTBF | jam operasi ÷ jumlah temuan di periode |
| Repeat Failure | temuan dengan unit + komponen + damage yang sama dengan temuan sebelumnya |

Jam operasi MTBF hanya menjumlahkan kenaikan hour meter berurutan yang wajar: > 0, ≤ 24 jam × hari berlalu, bacaan nol dan reset diabaikan. Unit yang dihitung hanya unit yang punya plan atau temuan di periode. Tanpa pembersihan ini, lonjakan HM membuat MTBF YTD jutaan jam.

Kondisi data per 2026-10-06: PA selalu terhitung selama site punya unit ACTIVE (downtime dari temuan; ke depan dari seluruh breakdown). QC Pass Rate butuh `qc_status` PASS/FAIL di actual. MTD September tidak punya bacaan HM, sehingga MTBF MTD kosong.

### Drill-down (spec bagian 13, dibangun 2026-10-07)

Klik kartu KPI, baris tabel KPI per kategori, kotak "> 30 Days" / "Critical Backlog" di Backlog Aging, atau tombol **Detail** di panel membuka `DrilldownDialog` (daftar baris di balik angka itu). Filter dashboard yang aktif (period, view, site, program) ikut terpakai. Kolom **Reg. No** di daftar = nomor register `maintenance_actuals` (spec menyebutnya WO), link ke `/maintenance-actuals/view/[id]` di tab baru.

- Service: `getControlDrilldown(session, query, kind, options)` di `lib/fms/dashboard/control-drilldown.ts`. Data dimuat lewat `loadControlData` yang sama dengan `getMaintenanceControl`, sehingga jumlah baris selalu sama dengan angka KPI.
- API: `GET /api/dashboard/maintenance-control/drilldown?kind=&year=&month=&mode=&projectId=&programId=&bucket=&qc=&severity=&open=1&overdue=1&repeat=1` (izin `maintenance-dashboard.drilldown`).
- Alasan backlog: `PATCH /api/maintenance-plans/details/[id]/reason` body `{ reason }` (izin `maintenance-plan.update`, akses site dicek). Teks kosong = hapus alasan. Service `updatePlanDetailReason` di `lib/fms/maintenance-plans.ts`.
- Mapping KPI → daftar: `DRILLDOWNS` di `src/views/dashboards/maintenance-control/shared.js`.

| Kind | Dipakai oleh | Isi baris |
|---|---|---|
| `pm` | PM Compliance, On-Time, Schedule Adherence, Overdue | plan date, unit, site, program, WO, tanggal actual, hasil (On time / Late / Overdue / Not due), hari telat, PIC |
| `backlog` (+`bucket` 0_7/8_14/15_30/gt30) | Total Backlog, bucket aging, kotak > 30 Days | due date, unit, program, aging (hari), **reason** (bisa diedit), planner, dikerjakan setelah cut-off |
| `qc` (+`qc`) | QC Pass Rate | WO, tanggal, unit, program, hasil QC, PIC, mekanik, remarks, jumlah temuan. "Detail checklist" = detail maintenance di halaman view actual |
| `findings` (+`severity`, `open`, `overdue`, `repeat`) | Failure Closure, Critical Finding, Critical Backlog, Repeat Finding, Failure Frequency | tanggal temuan, unit, issue, kode, severity, status, closure, umur, WO, PIC |
| `repeat-failure` | Repeat Failure | unit + kode komponen/damage, jumlah ulang, riwayat tanggal + WO |
| `reliability` | MTBF, MTTR, tombol di Reliability Trend | per unit: jam operasi, jumlah failure, MTBF, repair closed, MTTR |
| `availability` | PA / Availability | per unit (ACTIVE + unit yang punya downtime): jam kalender, downtime, PA %, temuan penyebab downtime (tanggal → closure/open, jam, Reg. No). Memakai `downtimeByUnit()` yang sama dengan KPI PA |
| `program` | tombol Detail di donut dan Program Performance Detail | per program × site: plan, actual, achievement |

Dialog punya ringkasan (chip), pencarian, paging 25/50/100, dan Export CSV (sisi klien). Diverifikasi 2026-10-07 (Okt 2026 YTD): jumlah baris tiap daftar sama dengan KPI (PM 93,2%, backlog 87 / >30 82, QC 90,8%, closure 88,3%, repeat failure 24,5%, MTBF 239,2, MTTR 240, critical 7).

### Output / Export (spec bagian 14, dibangun 2026-10-07)

Tombol di kanan atas dashboard memakai filter yang sedang aktif:

| Output | Cara | Isi |
|---|---|---|
| Excel | **Export Excel** → `GET /api/exports/maintenance-control?year=&month=&mode=&projectId=&programId=` (izin `maintenance-dashboard.export`; tombol Print/PDF juga) | Sheet *Summary* (filter, cut-off, KPI + target + status berwarna, tabel program, top issues), *Monthly Trend* (KPI per bulan + backlog aging per akhir bulan), lalu satu sheet per daftar drill-down: PM Plan vs Actual, Backlog (+ reason, siapa/kapan), QC, Findings, Open Critical Findings, Repeat Failure, MTBF MTTR by Unit, PA by Unit, Program by Site (11 sheet). Reg. No = hyperlink ke view actual (`AUTH_URL`). Waktu ditulis dalam zona waktu browser (`&tz=`) |
| PDF | **Print / PDF** → tab baru `/dashboards/maintenance-control/print/?period=&view=&site=&program=` → tombol *Print / Save as PDF* (browser) | Management report A4 landscape 3 halaman: kartu KPI + tren/backlog/program; tabel KPI per kategori + top issues; detail program + critical aging + reliability |
| Print-friendly | halaman print yang sama | Selalu tema terang dan kartu bergaris; toolbar disembunyikan saat cetak |
| CSV | tombol Export CSV di setiap dialog drill-down | Baris daftar yang sedang dibuka (sisi klien) |

- Builder: `buildControlWorkbook(session, query)` di `lib/fms/dashboard/control-export.ts`. Builder ini memuat `loadControlData` satu kali lalu memanggil `getMaintenanceControl(session, query, data)` dan `buildDrilldown(data, kind, options)`. Karena itu angka di Excel = dashboard = drill-down. Diverifikasi Okt 2026 YTD: ±170 KB, ±0,9 detik.
- Halaman print memakai komponen chart/tabel dashboard yang sama tanpa handler klik. Lebar konten dikunci 281 mm baik di layar maupun saat cetak, supaya ukuran chart ApexCharts tidak berubah ketika dicetak.
- Filter ↔ URL: `filtersFromQuery` / `filtersToQuery` / `filtersToApiParams` di `FilterBar.js` (dipakai dashboard, print, dan tombol export).

### Acceptance criteria (spec bagian 15, dicek 2026-10-07)

| # | Kriteria | Bukti |
|---|---|---|
| 1 | Filter Site, MTD/YTD konsisten | Semua panel, drill-down, Excel, dan print memakai `loadControlData` dengan filter yang sama. Jumlah per program = total All |
| 2 | Rekonsiliasi dengan raw data | Drill-down + sheet Excel per daftar; jumlah baris = angka KPI |
| 3 | Denominator terdokumentasi | Tabel rumus di atas. **Catatan:** PM Compliance dan Schedule Adherence membagi dengan semua baris plan di periode, termasuk yang belum jatuh tempo (spec: "Actual ÷ PM Due"). User memilih tetap begini untuk sekarang (2026-10-07) |
| 4 | Aging mengikuti cut-off | cut-off = min(akhir periode, hari ini) |
| 5 | Critical backlog/finding bisa ditelusuri | Drill-down `findings` (critical, open, overdue) dengan Reg. No |
| 6 | Semua KPI bisa drill-down | `DRILLDOWNS` mencakup semua 19 KPI (PA ditambah 2026-10-07) |
| 7 | Target + ambang RAG tanpa ubah kode | System → KPI Targets. Margin kuning sekarang juga berlaku untuk COUNT_ZERO (migrasi `20261007120000` mengisi margin 1 = spec bagian 11) |
| 8 | Timestamp update data | `period.dataUpdatedAt` = perubahan terbaru plan / detail plan / actual / temuan / hm di scope site; `period.loadedAt` = waktu hitung. Tampil di filter bar, header + footer print, dan sheet Summary |
| 9 | Hak akses site/role | `resolveProjectFilter` di loader; izin `maintenance-dashboard.read` (lihat), `.drilldown` (daftar detail), `.export` (Excel + print) dan `maintenance-plan.update` + akses site (edit reason) |
| 10 | Export = dashboard | Excel memakai data yang sama (`getMaintenanceControl(…, data)` + `buildDrilldown`) |

### API untuk aplikasi lain (spec bagian 17, dibangun 2026-10-07)

- `GET /api/v1/fms/kpi/?site=&period=YYYY-MM&view=MTD|YTD&program=` mengembalikan objek `kpi` dengan 9 kunci persis contoh spec 17, ditambah `indicators` (19 KPI + target + status warna + `detail_list`).
- `GET /api/v1/fms/details/{list}/` menyajikan 8 daftar drill-down dengan paging `page` dan `page_size` (maks 1000).
- `GET /api/v1/fms/meta/` berisi site, program, kunci KPI, dan daftar list.
- Auth `Authorization: Bearer <token>`. Token dibuat di **System → API Tokens** dan bertindak sebagai user yang dipilih: scope site dan permission ikut user, dan wajib punya `maintenance-dashboard.read` (+ `maintenance-dashboard.drilldown` untuk `/details`).
- Angka sama dengan dashboard. Verifikasi Okt 2026 YTD lewat HTTP + token: semua 9 nilai `kpi` = kartu dashboard; backlog `gt30` total 82; critical open 7; PA 017C MTD 98,5.
- Referensi lengkap: [fms-api.md](fms-api.md) dan [fms-api.openapi.yaml](fms-api.openapi.yaml).

## Berikutnya — temuan terbuka pada actual

Form add/edit actual (`MaintenanceActualForm`) menampilkan failure unit itu yang `closure_date`-nya masih kosong. Menyimpan actual membuat satu follow untuk setiap failure yang masih terbuka. Progress tidak menghentikan frequency. `closure_date` menghentikan actual berikutnya.

- Inspeksi mencatat hose leak, status terbuka, dan boleh unggah foto lewat `attachments` dengan entity `MAINTENANCE_FAILURE`.
- Besok greasing pada unit yang sama menampilkan catatan failure itu.
- Setiap actual berikutnya, selama failure belum ditutup, menambah satu follow. Frequency = 1 + jumlah follow. Frequency lebih dari 1 berarti repeat finding. Failure-nya tetap satu baris.
- `progressed` hanya menandai apakah actual itu mengerjakan failure menuju tutup. Progres yang belum sampai closure tidak menghentikan kenaikan frequency.
- `closure_date` menghentikan kenaikan. Actual setelah itu tidak menambah frequency.
