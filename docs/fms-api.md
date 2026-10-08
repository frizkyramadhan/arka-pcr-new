# FMS API v1 — KPI maintenance untuk aplikasi lain

API baca-saja untuk aplikasi lain (Power BI, dashboard HO, ERP, script) yang perlu angka **Fundamental Maintenance Control**. Struktur KPI mengikuti spec bagian 17. Angkanya **sama persis** dengan dashboard `/dashboards/maintenance-control` untuk filter yang sama: semua endpoint memakai `loadControlData` yang juga dipakai dashboard, drill-down, dan export Excel.

Spesifikasi mesin (OpenAPI 3) ada di [`fms-api.openapi.yaml`](fms-api.openapi.yaml). Kamu bisa mengimpornya ke Postman, Insomnia, atau Swagger UI.

| Endpoint | Isi |
| --- | --- |
| `GET /api/v1/fms/kpi/` | Ringkasan KPI: objek `kpi` sesuai spec 17, plus 19 indikator lengkap dengan target dan status warna |
| `GET /api/v1/fms/details/{list}/` | Daftar detail di balik KPI (drill-down), dengan paging |
| `GET /api/v1/fms/meta/` | Data referensi: user token, site yang boleh dibaca, program, kunci KPI, list yang tersedia |

---

## 1. Base URL

```
{APP_URL}/api/v1/fms/
```

- `{APP_URL}` adalah alamat aplikasi, termasuk base path kalau ada. Contohnya `http://host/arka-pcr` di server yang memakai `NEXT_PUBLIC_BASE_PATH=/arka-pcr`, atau `http://localhost:3000` di lokal.
- **Selalu akhiri path dengan `/`**, misalnya `/kpi/` dan bukan `/kpi`. Aplikasi memakai `trailingSlash: true`, jadi path tanpa `/` dijawab redirect **308**. Banyak HTTP client tidak mengikuti redirect atau membuang header `Authorization` saat redirect.
- Semua respons berformat JSON (UTF-8) dengan header `Cache-Control: no-store`.

## 2. Autentikasi — API token

Setiap request wajib membawa header:

```
Authorization: Bearer arka_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cara membuat token (admin)

1. Login sebagai administrator, lalu buka **System → API Tokens** (`/admin/api-tokens/`). Halaman ini dijaga tiga permission khusus yang secara default hanya dimiliki role `administrator`:
   - `api-tokens.read`: melihat daftar token;
   - `api-tokens.create`: membuat token;
   - `api-tokens.revoke`: mencabut token.

   Permission ini bisa diberikan ke role lain lewat System → Roles.
2. Klik **Create token** dan isi:
   - **Name**: aplikasi pemakai token, misalnya `Power BI — HO dashboard`.
   - **Acts as user**: user yang "dipinjam" token. Token melihat **site dan permission yang sama** dengan user ini. Sebaiknya buat user khusus (service user) dengan role dan site yang secukupnya.
   - **Expires after**: 30, 90, 180, 365 hari, atau *Never*.
3. Token tampil **satu kali** di dialog. Salin, lalu simpan di secret store aplikasi pemakai. Server hanya menyimpan hash SHA-256, sehingga token yang hilang tidak bisa dilihat lagi dan harus dibuat ulang.
4. Untuk mencabut akses, klik ikon **Revoke** di baris token. Sejak saat itu request dengan token tersebut ditolak dengan `401`. Baris token tetap tersimpan untuk audit.

### Aturan akses

- User token wajib punya permission **`maintenance-dashboard.read`**, sama dengan syarat melihat dashboard. Endpoint `/details/{list}` juga butuh **`maintenance-dashboard.drilldown`** (sama dengan drill-down di dashboard). Tanpa permission ini request ditolak `403 FORBIDDEN`.
- Site scope mengikuti user:
  - user HO (`000H`) atau admin bisa membaca semua site;
  - user site hanya membaca site yang ditugaskan kepadanya.
  - `site=ALL` berarti "semua site dalam scope user". Meminta site di luar scope ditolak `403 SITE_FORBIDDEN`.
- Role dan site dibaca ulang dari database di **setiap request**. Perubahan role atau site user langsung berlaku tanpa perlu membuat token baru.
- Token ditolak jika sudah di-revoke, kedaluwarsa, atau user-nya dinonaktifkan.
- Waktu dan IP pemakaian terakhir tercatat di kolom **Last used** pada halaman admin (diperbarui paling sering sekali per menit). Pembuatan dan revoke token tercatat di Activity Logs (`log_name = api-tokens`).
- Token **hanya** berlaku untuk `/api/v1/*`. Token tidak bisa dipakai untuk API internal aplikasi atau untuk login ke UI.
- Request dari browser yang sudah login (cookie sesi) juga diterima tanpa header. Ini memudahkan mencoba endpoint langsung dari address bar.

## 3. Parameter filter (semua endpoint data)

| Parameter | Nilai | Default | Keterangan |
| --- | --- | --- | --- |
| `site` | `ALL` atau kode project, misalnya `017C` | `ALL` | Site di luar scope user → `403 SITE_FORBIDDEN` |
| `period` | `YYYY-MM` | bulan berjalan | Bulan acuan |
| `view` | `MTD` \| `YTD` | `YTD` | MTD = 1 bulan; YTD = Jan s.d. bulan `period` |
| `program` | id atau nama program (tidak peka huruf besar/kecil), atau `ALL` | semua | Contoh: `Greasing`. Daftar program ada di `/meta/` |

**Cut-off.** Perhitungan berhenti di `min(akhir periode, hari ini)`. Untuk bulan berjalan, angka adalah posisi hari ini; nilai cut-off dikembalikan di `range.cutoff`.

**Kesegaran data.** `data_updated_at` adalah waktu perubahan data terakhir (plan, actual, temuan, HM) dalam scope. `generated_at` adalah waktu respons dibuat.

## 4. `GET /api/v1/fms/kpi/`

Ringkasan KPI untuk satu filter.

```bash
curl -H "Authorization: Bearer $ARKA_TOKEN" \
  "http://host/arka-pcr/api/v1/fms/kpi/?site=ALL&period=2026-10&view=YTD"
```

Respons `200` (dipotong):

```json
{
  "site": "ALL",
  "period": "2026-10",
  "view": "YTD",
  "program": null,
  "kpi": {
    "pm_compliance": 93.2,
    "on_time_compliance": 76.3,
    "backlog_gt30": 82,
    "qc_pass_rate": 90.8,
    "finding_closure": 88.3,
    "repeat_failure_rate": 24.5,
    "mtbf_hours": 239.2,
    "mttr_hours": 240,
    "availability": 99.1
  },
  "range": { "start": "2026-01-01", "end": "2026-10-31", "cutoff": "2026-10-31" },
  "indicators": [
    {
      "key": "pm_compliance",
      "code": "PM_COMPLIANCE",
      "label": "PM Compliance",
      "value": 93.2,
      "unit": "percent",
      "target": { "value": 95, "direction": "HIGHER", "yellow_margin": 5 },
      "status": "yellow",
      "state": "ready",
      "note": null,
      "detail": "1162 of 1247 plan rows done",
      "detail_list": "pm"
    }
  ],
  "data_updated_at": "2026-10-06T06:40:09.497Z",
  "generated_at": "2026-10-07T06:01:12.345Z",
  "api_version": "v1"
}
```

- **`kpi`** berisi sembilan kunci persis seperti contoh spec bagian 17. Nilainya `null` kalau belum ada data (misalnya belum ada temuan pada periode itu sehingga MTBF tidak bisa dihitung).
- **`program`** bernilai `null` untuk semua program, atau `{ "id", "name" }` kalau difilter.
- **`indicators`** berisi ke-19 KPI dashboard, masing-masing dengan field berikut:

| Field | Isi |
| --- | --- |
| `key` | Kunci API (snake_case), lihat tabel di bawah |
| `code` | Kode KPI internal, sama dengan `kpi_code` di KPI Targets |
| `value` | Angka, atau `null` jika `state = no_data` |
| `unit` | `percent` \| `hours` \| `count` |
| `target` | `{ value, direction: HIGHER\|LOWER\|COUNT_ZERO, yellow_margin }` dari menu KPI Targets, atau `null` jika KPI tidak bertarget |
| `status` | Warna kartu: `green` \| `yellow` \| `red`, atau `null` jika tanpa target atau tanpa data |
| `state` | `ready` \| `no_data` |
| `note` | Alasan bila `no_data`, misalnya "No findings recorded in this period" |
| `detail` | Penjelasan angka, misalnya "1162 of 1247 plan rows done" |
| `detail_list` | Path list detail yang menjelaskan KPI ini, misalnya `backlog?bucket=gt30`. Panggil `/details/{detail_list}` dengan filter yang sama |

### Daftar kunci KPI

| `key` | `code` | Satuan | Di `kpi` (spec 17) | `detail_list` |
| --- | --- | --- | --- | --- |
| `pm_compliance` | PM_COMPLIANCE | % | ✓ | `pm` |
| `on_time_compliance` | ON_TIME_COMPLIANCE | % | ✓ | `pm` |
| `backlog_gt30` | BACKLOG_GT30 | count | ✓ | `backlog?bucket=gt30` |
| `qc_pass_rate` | QC_PASS_RATE | % | ✓ | `qc` |
| `finding_closure` | FAILURE_CLOSURE | % | ✓ | `findings` |
| `repeat_failure_rate` | REPEAT_FAILURE | % | ✓ | `repeat-failure` |
| `mtbf_hours` | MTBF | jam | ✓ | `reliability` |
| `mttr_hours` | MTTR | jam | ✓ | `reliability` |
| `availability` | PA_AVAILABILITY | % | ✓ | `availability` |
| `schedule_adherence` | SCHEDULE_ADHERENCE | % | | `pm` |
| `overdue_maintenance` | OVERDUE_MAINTENANCE | % | | `pm` |
| `total_backlog` | TOTAL_BACKLOG | count | | `backlog` |
| `backlog_0_7` | BACKLOG_0_7 | count | | `backlog?bucket=b0_7` |
| `backlog_8_14` | BACKLOG_8_14 | count | | `backlog?bucket=b8_14` |
| `backlog_15_30` | BACKLOG_15_30 | count | | `backlog?bucket=b15_30` |
| `critical_backlog` | CRITICAL_BACKLOG | count | | `findings?severity=CRITICAL&open=1&overdue=1` |
| `repeat_finding_rate` | REPEAT_FINDING | % | | `findings?repeat=1` |
| `critical_findings_open` | CRITICAL_FAILURE | count | | `findings?severity=CRITICAL&open=1` |
| `failure_frequency` | FAILURE_FREQUENCY | count | | `findings` |

Rumus setiap KPI dijelaskan di [fms-control-dashboard-implementation.md](fms-control-dashboard-implementation.md) (bagian "Dashboard Maintenance Control").

## 5. `GET /api/v1/fms/details/{list}/`

Baris-baris di balik KPI. Isinya sama dengan drill-down di dashboard dan sheet detail di export Excel.

| `{list}` | Isi | Opsi tambahan |
| --- | --- | --- |
| `pm` | Semua baris plan periode + WO, tanggal actual, hasil (On time / Late / Not done), hari terlambat | — |
| `backlog` | Baris plan belum selesai per cut-off, aging, **reason** pending | `bucket=b0_7\|b8_14\|b15_30\|gt30` |
| `qc` | WO dengan QC Pass/Fail | `qc=FAIL` |
| `findings` | Temuan periode: severity, issue, WO, closure, aging | `severity=CRITICAL\|MAJOR\|MINOR`, `open=1` (masih open per cut-off), `overdue=1`, `repeat=1` |
| `repeat-failure` | Pasangan unit + kode kegagalan yang berulang, beserta riwayat | — |
| `reliability` | MTBF/MTTR per unit: jam operasi, jumlah failure, jam perbaikan | — |
| `availability` | PA per unit: jam kalender, downtime, PA, riwayat downtime | — |
| `program` | Ringkasan plan vs actual per program dan site | — |

Paging:

| Parameter | Default | Batas |
| --- | --- | --- |
| `page` | 1 | ≥ 1 |
| `page_size` | 100 | 1–1000 |

```bash
curl -H "Authorization: Bearer $ARKA_TOKEN" \
  "http://host/arka-pcr/api/v1/fms/details/backlog/?period=2026-10&bucket=gt30&page=1&page_size=100"
```

Respons `200` (dipotong):

```json
{
  "list": "backlog",
  "title": "Backlog > 30 days",
  "subtitle": "Plan rows not done by the cut-off. Aging = cut-off − plan (due) date. ...",
  "site": "ALL",
  "period": "2026-10",
  "view": "YTD",
  "program": null,
  "options": { "bucket": "gt30" },
  "range": { "start": "2026-01-01", "end": "2026-10-31", "cutoff": "2026-10-31" },
  "summary": [
    { "label": "Open", "value": 87 },
    { "label": "0–7 days", "value": 2 },
    { "label": "> 30 days", "value": 82 }
  ],
  "columns": [
    { "key": "due_date", "label": "Due date", "type": "date" },
    { "key": "unit", "label": "Unit", "type": "text" },
    { "key": "aging", "label": "Aging (days)", "type": "number" },
    { "key": "reason", "label": "Reason", "type": "reason" },
    { "key": "done_later", "label": "Done after cut-off", "type": "work_order" }
  ],
  "data": [
    {
      "id": "cmuuwdkw600a9xo4z9ussajuz",
      "due_date": "2026-01-02",
      "unit": "E 079",
      "site": "021C",
      "program": "Greasing",
      "aging": 302,
      "reason": { "plan_detail_id": "cmuuwdkw600a9xo4z9ussajuz", "text": null, "updated_by": null, "updated_at": null },
      "planner": "Administrator",
      "done_later": null
    }
  ],
  "pagination": { "page": 1, "page_size": 100, "total": 82, "total_pages": 1 },
  "data_updated_at": "2026-10-06T06:40:09.497Z",
  "generated_at": "2026-10-07T06:01:15.012Z",
  "api_version": "v1"
}
```

- `summary` menghitung **seluruh** list, bukan hanya halaman yang diminta. `columns` menjelaskan setiap kunci di `data`.
- Bentuk nilai menurut `columns[].type`:

| `type` | Bentuk nilai |
| --- | --- |
| `text` | string atau `null` |
| `date` | `YYYY-MM-DD` |
| `number` | angka atau `null` |
| `status` | label string, misalnya `"On time"`, `"Critical"`, `"Open"` |
| `work_order` | `{ "id", "reg_no", "url", "date"? }` atau `null`. `url` membuka halaman actual di aplikasi |
| `reason` | `{ "plan_detail_id", "text", "updated_by", "updated_at" }`; reason pending diisi di drill-down Backlog dashboard |
| `list` | array string, misalnya riwayat kejadian |

- Urutan baris tetap (backlog: aging terlama dulu; pm: tanggal plan terbaru dulu), jadi paging bisa diulang dengan konsisten selama data tidak berubah.

## 6. `GET /api/v1/fms/meta/`

```bash
curl -H "Authorization: Bearer $ARKA_TOKEN" "http://host/arka-pcr/api/v1/fms/meta/"
```

```json
{
  "user": { "id": 12, "name": "svc-powerbi", "all_sites": false },
  "sites": [{ "code": "ALL", "name": "All sites in scope" }, { "code": "017C", "name": "..." }],
  "programs": [{ "id": "cmm2wteob0002zomjgm2hgnmd", "name": "Greasing" }],
  "views": ["MTD", "YTD"],
  "kpis": [{ "key": "pm_compliance", "code": "PM_COMPLIANCE", "label": "PM Compliance", "unit": "percent", "in_summary": true, "detail_list": "pm" }],
  "lists": [{ "list": "backlog", "options": ["bucket=b0_7|b8_14|b15_30|gt30"] }],
  "paging": { "default_page_size": 100, "max_page_size": 1000 },
  "api_version": "v1"
}
```

Panggil `/meta/` saat aplikasi pemakai start untuk mengisi pilihan site/program, daripada menulisnya hardcode.

## 7. Error

Semua error memakai format yang sama:

```json
{ "error": { "code": "INVALID_PARAMETER", "message": "period must be YYYY-MM, e.g. 2026-09" } }
```

| HTTP | `code` | Penyebab |
| --- | --- | --- |
| 400 | `INVALID_PARAMETER` | `period`, `view`, `program`, `page`, `page_size`, `bucket`, `severity`, atau `qc` tidak valid |
| 401 | `UNAUTHORIZED` | Header tidak ada atau format salah, token salah, di-revoke, kedaluwarsa, atau user nonaktif (alasan ada di `message`) |
| 403 | `FORBIDDEN` | User token tidak punya `maintenance-dashboard.read` (atau `maintenance-dashboard.drilldown` untuk `/details`) |
| 403 | `SITE_FORBIDDEN` | `site` di luar scope user token |
| 404 | `UNKNOWN_LIST` | `{list}` tidak dikenal |
| 500 | `SERVER_ERROR` | Kesalahan server; detail ada di log server |

## 8. Contoh kode

**JavaScript / Node 18+**

```js
const BASE = 'http://host/arka-pcr/api/v1/fms'
const headers = { Authorization: `Bearer ${process.env.ARKA_TOKEN}` }

const res = await fetch(`${BASE}/kpi/?site=017C&period=2026-10&view=MTD`, { headers })
if (!res.ok) throw new Error((await res.json()).error.message)
const { kpi } = await res.json()
console.log(kpi.pm_compliance, kpi.availability)

// Ambil seluruh backlog > 30 hari, halaman demi halaman
const rows = []
for (let page = 1; ; page += 1) {
  const r = await fetch(`${BASE}/details/backlog/?period=2026-10&bucket=gt30&page=${page}&page_size=1000`, { headers })
  const body = await r.json()
  rows.push(...body.data)
  if (page >= body.pagination.total_pages) break
}
```

**Python**

```python
import os, requests

BASE = "http://host/arka-pcr/api/v1/fms"
headers = {"Authorization": f"Bearer {os.environ['ARKA_TOKEN']}"}

r = requests.get(f"{BASE}/kpi/", params={"site": "ALL", "period": "2026-10", "view": "YTD"}, headers=headers, timeout=60)
r.raise_for_status()
print(r.json()["kpi"])
```

**PowerShell**

```powershell
$h = @{ Authorization = "Bearer $env:ARKA_TOKEN" }
Invoke-RestMethod -Headers $h -Uri "http://host/arka-pcr/api/v1/fms/kpi/?period=2026-10&view=YTD" | Select-Object -ExpandProperty kpi
```

**Power BI / Excel (Power Query)**

```powerquery
let
  Source = Json.Document(Web.Contents("http://host/arka-pcr/api/v1/fms/kpi/",
    [Query = [site = "ALL", period = "2026-10", view = "YTD"],
     Headers = [Authorization = "Bearer " & ArkaToken]])),
  Kpi = Record.ToTable(Source[kpi])
in
  Kpi
```

(`ArkaToken` adalah parameter Power Query. Jangan menulis token langsung di query yang dibagikan.)

## 9. Catatan operasional

- **Performa.** Satu request menghitung ulang dari database, seperti saat dashboard dibuka. Waktunya sekitar 0,5–3 detik untuk YTD semua site; request pertama setelah server start lebih lambat. Untuk polling, cukup tiap 5–15 menit, karena data berubah hanya saat plan/actual/temuan diinput. Bandingkan `data_updated_at` untuk tahu apakah ada perubahan.
- **Belum ada rate limit.** Kalau API dibuka ke banyak aplikasi, pertimbangkan rate limit di reverse proxy (nginx/Traefik).
- **Keamanan.**
  - Panggil lewat HTTPS di luar jaringan internal.
  - Simpan token di secret store, satu token per aplikasi.
  - Pakai service user dengan scope minimum.
  - Revoke token yang tidak dipakai lagi.
  - Token berawalan `arka_` agar mudah dideteksi oleh secret scanner.
- **Versi.** Perubahan yang memecah kontrak akan dibuat di `/api/v2/`. Penambahan field baru di v1 dianggap kompatibel, jadi aplikasi pemakai harus mengabaikan field yang tidak dikenal.

## 10. Implementasi (untuk developer ARKA)

| Bagian | File |
| --- | --- |
| Tabel token | `prisma/schema.prisma` model `ApiToken` (`api_tokens`), migrasi `20261007140000_api_tokens` |
| Buat, list, revoke, dan autentikasi token | `lib/api-tokens.ts` |
| Auth Bearer, format error, parsing filter, pemetaan KPI/kolom | `lib/fms/api-v1.ts` |
| Endpoint | `src/app/api/v1/fms/kpi/route.ts`, `src/app/api/v1/fms/details/[list]/route.ts`, `src/app/api/v1/fms/meta/route.ts` |
| Admin token | `src/pages/admin/api-tokens/index.js`, `src/app/api/api-tokens/route.ts`, `src/app/api/api-tokens/[id]/route.ts` |
| Permission | `api-tokens.read` / `.create` / `.revoke` di `lib/rbac/permission-catalog.ts`, dipasang ke template `administrator` (`lib/rbac/role-templates.ts`), ACL subject `api-tokens` (`src/configs/acl.js`). Sinkron ke DB lewat `npm run rbac:seed` |
| Sumber angka | `lib/fms/dashboard/control.ts` (`loadControlData`, `getMaintenanceControl`), `lib/fms/dashboard/control-drilldown.ts` (`buildDrilldown`) |
