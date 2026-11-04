# DMBD API v1 — Daily Monitoring Breakdown untuk aplikasi lain

API baca-saja untuk aplikasi lain (Power BI, dashboard HO, mobile, script) yang butuh data **Daily Monitoring Unit Breakdown (DMBD)** dan daftar Breakdown. Angka `/kpi` **sama** dengan dashboard `/dashboards/dmbd` untuk filter yang sama (`loadDmbdDashboard`). Auth memakai **Bearer API token** yang sama dengan FMS API (System → API Tokens).

| Endpoint | Isi |
| --- | --- |
| `GET /api/v1/dmbd/meta/` | Referensi: user token, site, filter, daftar endpoint |
| `GET /api/v1/dmbd/kpi/` | Ringkasan KPI DMBD + baris unit (dashboard) |
| `GET /api/v1/dmbd/breakdowns/` | Daftar breakdown (paging) |
| `GET /api/v1/dmbd/breakdowns/{id}/` | Detail satu breakdown + activities |

---

## 1. Base URL

```
{APP_URL}/api/v1/dmbd/
```

- `{APP_URL}` termasuk base path jika ada (contoh `http://host/arka-pcr`).
- **Selalu akhiri path dengan `/`** (`trailingSlash: true`). Path tanpa `/` → redirect 308; banyak client membuang header `Authorization` saat redirect.
- Respons JSON UTF-8, `Cache-Control: no-store`.

## 2. Autentikasi

```
Authorization: Bearer arka_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Token dibuat di **System → API Tokens** (sama dengan FMS). Lihat [fms-api.md](fms-api.md) bagian autentikasi. Token mengikuti admin yang membuatnya (tanpa pilih user lain).

### Aturan akses

- Pembuat token wajib punya permission **`breakdown.read`** (sama dengan melihat menu Breakdown / DMBD).
- Site scope mengikuti admin pemilik token (HO/admin = semua site; user site = site yang ditugaskan).
- Token hanya berlaku di `/api/v1/*`. Tanpa header Bearer, sesi browser juga diterima (untuk uji dari address bar).

## 3. `GET /api/v1/dmbd/meta/`

```bash
curl -H "Authorization: Bearer $ARKA_TOKEN" \
  "http://host/arka-pcr/api/v1/dmbd/meta/"
```

Mengembalikan `user`, `sites`, `views`, `status_filters`, `endpoints`, `kpi_keys`, `paging`, `api_version`.

## 4. `GET /api/v1/dmbd/kpi/`

Ringkasan dashboard DMBD.

| Parameter | Default | Keterangan |
| --- | --- | --- |
| `site` | `ALL` | Kode project, atau `ALL` dalam scope |
| `period` | bulan berjalan (jika `view` set) | `YYYY-MM` |
| `view` | `YTD` | `MTD` \| `YTD` — kosongkan/`DAY` untuk mode live per `date` |
| `date` | — | `YYYY-MM-DD` (mode hari / live) |
| `plant` | — | Plant type unit |
| `category` | — | Plant group |
| `status` | — | `breakdown` \| `waiting_part` \| `under_repair` \| `ready` |

```bash
curl -H "Authorization: Bearer $ARKA_TOKEN" \
  "http://host/arka-pcr/api/v1/dmbd/kpi/?site=023C&period=2026-11&view=YTD"
```

Respons (inti): filter echo + payload dashboard dalam **snake_case**:

- `kpis` — total_units, breakdown, waiting_part, under_repair, ready, lost_hours, mttr_hours, delta, …
- `reliability` — mttr / mtbf / pa (value, target, status warna)
- `trend`, `by_site`, `by_component`
- `rows` — baris unit dashboard
- `longest` — 5 aging terpanjang
- `as_of`, `period`, `options`, `generated_at`, `api_version`

## 5. `GET /api/v1/dmbd/breakdowns/`

Daftar episode breakdown (bukan populasi unit dashboard).

| Parameter | Default | Keterangan |
| --- | --- | --- |
| `site` / `project_code` | `ALL` | Filter project |
| `status` | — | `open` \| `closed` \| `cancelled` (status WO / finish) |
| `position` / `status_unit` | — | `BD` \| `OP` \| `SB` \| `AJ` \| `RFU` \| `CANCEL` |
| `fleet_unit_id` | — | ID unit cache |
| `q` | — | Cari register_no, WO, unit, problem, … |
| `bd_from` / `bd_to` | — | Rentang BD date (`YYYY-MM-DD`) |
| `finish_from` / `finish_to` | — | Rentang finish |
| `description` | — | Filter problem |
| `page` | `1` | Halaman 1-based |
| `page_size` | `100` | Maks 1000 |
| `sort_field` | `startedAt` | |
| `sort_order` | `desc` | `asc` \| `desc` |

```bash
curl -H "Authorization: Bearer $ARKA_TOKEN" \
  "http://host/arka-pcr/api/v1/dmbd/breakdowns/?site=023C&status=open&page=1&page_size=50"
```

Respons:

```json
{
  "site": "023C",
  "page": 1,
  "page_size": 50,
  "total": 12,
  "data": [
    {
      "id": "...",
      "register_no": "BD-023C.2611-0001",
      "unit_no": "EX-01",
      "status_unit": "BD",
      "work_order": "265171",
      "started_at": "2026-11-02T08:15:00.000Z",
      "downtime_hours": 4.5
    }
  ],
  "generated_at": "...",
  "api_version": "v1"
}
```

## 6. `GET /api/v1/dmbd/breakdowns/{id}/`

Detail + `activities[]` (kode, posisi, start/end, mechanics, details).

```bash
curl -H "Authorization: Bearer $ARKA_TOKEN" \
  "http://host/arka-pcr/api/v1/dmbd/breakdowns/{id}/"
```

## 7. Error

Bentuk sama FMS:

```json
{ "error": { "code": "FORBIDDEN", "message": "..." } }
```

| HTTP | `code` |
| --- | --- |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` / `SITE_FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 400 | `INVALID_PARAMETER` |
| 500 | `SERVER_ERROR` |

## 8. Implementasi

- Auth + mapper: `lib/dmbd/api-v1.ts`
- Loader KPI: `lib/dmbd/dashboard-db.ts` → `loadDmbdDashboard`
- List/detail: `lib/dmbd/list.ts`
- Routes: `src/app/api/v1/dmbd/**`
