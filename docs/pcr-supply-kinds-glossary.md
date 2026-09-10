# Glossary — PCR supply kinds & policy profiles

> **Status**: Capture schema/UI 2026-09-09; approval Repair `SHORT_TO_PLM` + spawn `compHour` by `repairLifeMode` (2026-09-10). Recount produksi belum.  
> **Source**: Chat Dwi Septiani ARKA + current ARKA PCR model.  
> **Related**: [`docs/decisions.md`](./decisions.md) (PROPOSED ADR), [`docs/forecast-replacement-relationship.md`](./forecast-replacement-relationship.md).  
> **Scope**: Forecast **create** category, nested Repair, life-on-close, approval vs close vs remarks. Bukan schema/kode.

Istilah bisnis di tabel ini. Nama field/kode hanya di bagian *Mapping ke kode hari ini* dan ADR.

---

## Core entities (sudah ada)

| Term | Meaning |
|------|---------|
| **PCR** | Planned Component Replacement — rencana + realisasi pergantian/perlakuan komponen alat berat. |
| **PCR Forecast** | Rencana + BA PCR + approval (`pcr_forecast`). Aggregate root create. |
| **Replacement / PCR Actual** | Record eksekusi lapangan (`replacement`); `wo_status` = siklus OPEN/CLOSE, **bukan** dokumen SAP. |
| **`id_rep`** | Tali hubung forecast ↔ replacement. |
| **Proceed to Replacement** | Handoff resmi setelah BA Fully Approved (`converted_at`). |
| **BA PCR** | Dokumen approval milik forecast. |
| **`wo_no`** | Nomor dokumen Work Order **SAP** di replacement — bukan entitas replacement. |
| **Oldcore** | Bukti return core (`return_oldcore_date`, `spb_ba_return_oldcore`) saat close profile mewajibkan procurement. |
| **MR / PR / PO** | Nomor dokumen procurement di replacement. |
| **Installation report** | PDF; wajib close jika komponen **MAJOR** (aturan hari ini). |
| **PLM / Plant Manager** | Terminal rantai pendek BA PCR (Pak Ir untuk Repair per stakeholder). |
| **PD / President Director** | Terminal rantai penuh BA PCR (Pak Yuwana untuk New / PTA per stakeholder). |
| **Warranty (hari ini)** | Jalur komersial terpisah: rantai pendek **dan** close tanpa procurement. **Bukan** salah satu dari tiga kategori create di bawah. |

---

## Create category (wajib)

Kategori PCR dipilih **saat create forecast non-warranty**. Wajib pada jalur itu. Bukan sinonim `is_warranty`. Tombol **Create with Warranty** tetap hidup; PTA / New / Repair **tidak** dipakai di forecast warranty.

| Enum | Label (ID) | Meaning |
|------|------------|---------|
| **`PTA_REMAN`** | PTA Reman | Oldcore dikirim ke vendor; ditukar dengan komponen **reconditioned milik/identitas vendor** (bukan core kita yang kembali). |
| **`NEW_COMPONENT`** | Komponen Baru | Supply komponen baru. |
| **`REPAIR`** | Repair / Perbaikan | Perbaikan komponen (bukan tukar reman, bukan new). Nested Repair **hanya** valid di sini. |

Approval **diturunkan** dari kategori (bukan diisi user terpisah):

| Category | Approval profile | Label |
|----------|------------------|-------|
| `PTA_REMAN`, `NEW_COMPONENT` | **`FULL_TO_PD`** | Rantai penuh sampai PD |
| `REPAIR` | **`SHORT_TO_PLM`** | Rantai pendek sampai PLM |

Close **tidak** diturunkan dari approval. PTA, New, dan Repair (semua site + semua life mode) memakai **checklist close replacement non-warranty hari ini**: MR + PR + PO + oldcore (+ installation report jika MAJOR). Warranty = pendek + **tanpa** procurement.

---

## Repair site & vendor (hanya `REPAIR`)

| Enum / field | Label (ID) | Meaning |
|--------------|------------|---------|
| **`RepairSite`** | Lokasi repair | Tempat pengerjaan. Wajib jika category = `REPAIR`. |
| **`ON_SITE`** | On Site / Di lokasi | Repair di site. Tidak ada `vendorKind` / `dealerName`. |
| **`OUT_SITE`** | Out Site / Di luar lokasi | Repair di luar site. Wajib pilih `vendorKind`. |
| **`RepairVendorKind`** | Tujuan out-site | Hanya jika `OUT_SITE`. |
| **`APS`** | APS | **Workshop project Kariangau** (bukan dealer, bukan vendor bernama APS di luar site itu). Token boleh selaras `project_code` APS. Tidak ada `dealerName`. |
| **`DEALER`** | Dealer | Vendor/dealer out-site. |
| **`dealerName`** | Nama dealer | Wajib **iff** `OUT_SITE` + `DEALER`. Free text sampai ada master. Kosong/forbidden jika `APS` atau On Site. |

---

## Repair life modes (semua jalur Repair)

`repairLifeMode` wajib untuk **semua** path Repair (On Site, Out Site APS, Out Site Dealer). Independen dari approval profile dan close/procurement profile.

| Enum | Label (ID) | Meaning (stakeholder, locked 2026-09-09) |
|------|------------|------------------------|
| **`RETURN`** | Return | **Tetap pilihan tipe terpisah.** Mekanik life = sama dengan Continue Life: life dan %life **lanjut**, **bukan** 0 saat close. |
| **`CONTINUE_LIFE`** | Continue Life | Life dan %life **lanjut**, **bukan** 0 saat close. |
| **`BACK_TO_ZERO`** | Back to Zero / Reset | Life / %life di-reset ke **0** pada close. |

Jangan gabung `RETURN` dan `CONTINUE_LIFE` di UI/storage. Bedanya label/tipe Repair, **bukan** rumus life.

Spawn OPEN: default `compHour: 0`. Return / Continue Life: **`compHour` tidak di-nolkan** (lanjut dari WO yang ditutup). `lastHmRep` tetap mengikuti close hari ini (boleh di-set HM tutup). `BACK_TO_ZERO` = `compHour: 0`. Implemented di `closeReplacement()` via `lib/replacement/close-life-policy.ts`.

---

## Remarks hints (auto default)

Default teks remark forecast, diturunkan dari identitas komponen (bukan kategori PCR):

| Jika komponen … | Default remark |
|-----------------|----------------|
| Kata kunci **cylinder** / **silinder** / **suspension** / **suspensi** (termasuk **CYLINDER HEAD**) | `"Reseal"` |
| Kata kunci **engine** | `"Top Overhaul"` |
| Selain itu | kosong |

Match **kata kunci** case-insensitive di `comp_desc`. **CYLINDER HEAD** = Reseal. Berlaku **semua kategori**. User boleh edit. **Ganti komponen → isi ulang** default (overwrite edit lama).

Field target: `pcr_forecast.remark` (create form **Remark**). Bukan `replacement.remarks` (teks WO; spawn close mengisi `''`).

---

## Policy dimensions (pisah boolean)

| Term | Meaning | Drive dari |
|------|---------|------------|
| **PCR supply category** | `PTA_REMAN` / `NEW_COMPONENT` / `REPAIR` | Input create (wajib) |
| **Approval profile** | `FULL_TO_PD` vs `SHORT_TO_PLM` | Category (Repair pendek; PTA & New penuh). Warranty lama juga pendek. |
| **Close profile** | Syarat close replacement | **Bukan** dari panjang rantai. PTA + New + Repair = checklist **non-warranty hari ini**. Warranty = tanpa procurement. |
| **Life reset policy** | `RETURN` / `CONTINUE_LIFE` / `BACK_TO_ZERO` | Hanya Repair. Return/Continue: spawn **`compHour` tidak di-nol**. PTA/New = `compHour: 0`. |
| **Remarks hint** | Default Remark | Kata kunci; semua category; ganti komponen = isi ulang |

**Invarian grill (tetap):** pendeknya rantai approval **tidak** boleh otomatis menghilangkan procurement di close, dan **tidak** boleh otomatis mereset (atau tidak mereset) life.

---

## Entity / value objects & invariants

Konsep, bukan tabel. Nama field di ADR = rekomendasi, belum committed.

### ForecastCreate (aggregate)

- **Identity**: forecast yang akan punya `id_forecast`.
- **Required** (hanya jika `is_warranty = false`): `category` ∈ {`PTA_REMAN`, `NEW_COMPONENT`, `REPAIR`}.
- **Warranty create**: category PTA/New/Repair **absent**; rantai + close tetap aturan warranty lama.
- **Optional nested**: `repair: RepairSpec` — **hanya** jika `category = REPAIR`; selain itu harus absen.
- **Derived**: `approvalProfile` dari category (tabel di atas). Warranty bukan derived dari category ini.
- **Independent**: close profile; life reset (via `RepairSpec.lifeMode` jika Repair).
- **Remark**: string; boleh terisi dari hints.

### RepairSpec (value object)

Valid **iff** `category = REPAIR`. Semua path Repair memuat `site` + `lifeMode`.

- `site`: `ON_SITE` | `OUT_SITE`
- `vendorKind`: `APS` | `DEALER` | absen
- `dealerName`: string | absen
- `lifeMode`: `RETURN` | `CONTINUE_LIFE` | `BACK_TO_ZERO`

### Invariants

1. **Category required at create non-warranty.** Forecast warranty baru **tanpa** category PTA/New/Repair. Tidak remap BA warranty in-flight ke Repair.
2. **Nested Repair only if `REPAIR`.** Jika category ≠ `REPAIR`, maka `site`, `vendorKind`, `dealerName`, `lifeMode` **forbidden** (null/absent). Tidak “tersisa” dari ganti category.
3. **`dealerName` required iff Out Site + Dealer.**  
   - `OUT_SITE` ∧ `DEALER` → `dealerName` mandatory (non-blank).  
   - `ON_SITE` → `vendorKind` dan `dealerName` absent.  
   - `OUT_SITE` → `vendorKind` required.  
   - `vendorKind = APS` → workshop Kariangau; `dealerName` absent. Unit project **non-APS boleh** Out Site ke APS.
4. **Life reset independent of approval profile.** `SHORT_TO_PLM` + `RETURN` sah; `SHORT_TO_PLM` + `BACK_TO_ZERO` sah. Jangan ikat reset ke rantai BA. Jangan ikat reset ke close/procurement.
5. **Close independent of approval.** Repair = `SHORT_TO_PLM` **dan** close checklist non-warranty hari ini. Warranty = `SHORT_TO_PLM` **dan** close tanpa procurement.
6. **`APS` = workshop project Kariangau.** Bukan dealer. `dealerName` absent.
7. **`RETURN` dan `CONTINUE_LIFE` tetap dua tipe.** Mekanik life identik (lanjut, bukan 0). Jangan collapse pilihan UI.

```text
category required
  ├─ PTA_REMAN | NEW_COMPONENT
  │    approval = FULL_TO_PD
  │    repair.* = absent
  │    close = non-warranty hari ini (MR+PR+PO+oldcore; report jika MAJOR)
  └─ REPAIR
       approval = SHORT_TO_PLM
       close    = sama (non-warranty hari ini)
       site required
         ├─ ON_SITE  → vendorKind, dealerName absent
         └─ OUT_SITE → vendorKind required
              ├─ APS    → dealerName absent
              └─ DEALER → dealerName required
       lifeMode required (RETURN | CONTINUE_LIFE | BACK_TO_ZERO)
```

---

## Warranty vs Repair (tetap penting)

| | **Warranty (hari ini)** | **Repair (stakeholder)** |
|--|-------------------------|--------------------------|
| Create | Tombol warranty tetap; **bukan** PTA/New/Repair | Hanya forecast **non-warranty** |
| Approval | PS → PM → PLM (`SHORT_TO_PLM`) | PS → PM → PLM (`SHORT_TO_PLM`) |
| Close | **Tanpa** MR/PR/PO/oldcore; report jika MAJOR | **Sama** non-warranty hari ini (MR+PR+PO+oldcore; report MAJOR) |
| Life on close | Tidak dibahas jalur warranty di grilling ini | `RETURN` / `CONTINUE_LIFE` / `BACK_TO_ZERO` |
| Encoding hari ini | `is_warranty = true` | **Tidak ada** — jangan pakai `is_warranty` |

Warranty tetap satu *sel* matrix yang sah (pendek + no-procurement), bukan sinonim Repair.

---

## Mapping ke `is_warranty` / close-requirements / remarks

| Bahasa stakeholder | Kode / helper hari ini | Gap / mapping yang diusulkan |
|--------------------|------------------------|------------------------------|
| New / PTA approval penuh | `getForecastApprovalChain(false)` → rantai sampai PD | Cocok `FULL_TO_PD`. PTA **bukan** flag baru di `is_warranty`. |
| Repair approval pendek | `getForecastApprovalChain(true)` | Panjang cocok `SHORT_TO_PLM`; **salah** jika itu berarti `is_warranty=true` karena close ikut berubah. |
| PTA / New / Repair close | `resolveReplacementCloseRequirements(false, …)` → `requiresProcurement: true` + MAJOR report | **Sama** checklist close non-warranty hari ini. |
| Warranty komersial | `is_warranty` + `requiresProcurement: !isWarranty` | Tetap sel matrix: pendek + no-procurement. Jangan merge ke `REPAIR`. |
| Life reset | Spawn OPEN `compHour: 0` hari ini | Return/Continue: **jangan** nolkan `compHour`. Back to 0: tetap 0. |
| Remark auto Reseal / Top OH | Form create → `pcr_forecast.remark` | Semua category; user edit; match **kata kunci**. Bukan `replacement.remarks`. |
| PTA / nested Repair / life mode | `pcr_forecast.pcr_supply_category` + `repair_*` | Capture 2026-09-09. Repair approval masih rantai PD sampai chain diprofilkan. |

`resolveReplacementCloseRequirements(isWarranty, hasLinkedForecast, isMajorComponent)` hari ini: jika ada forecast, `requiresProcurement = !isWarranty`. Itu sebabnya Repair **tidak** boleh di-encode sebagai warranty.

---

## Backfill / UX existing forecast (bukan default New massal)

**Jangan** set semua OPEN lama jadi New. Hitung dulu di **arka-docker** (produksi). Snapshot lokal `arka_pcr_new` (2026-09-09, SSH arka-docker timeout): OPEN non-warranty 54 tanpa BA; OPEN warranty APPROVED 2. Produksi “pending” menurut stakeholder **lebih banyak**.

| Keadaan | Aturan |
|---------|--------|
| Belum submit BA | Validasi **wajib** lengkapi tipe PCR (category + nested Repair jika perlu) **sebelum** submit. Tombol **Edit** ada. |
| Sudah submit, category masih kosong | **Jangan** blokir diam-diam. Tombol **khusus update** tipe PCR (bukan flow edit penuh). |
| Warranty | Tidak isi category PTA/New/Repair. |

---

## Open questions (sisa)

Terkunci tambahan 2026-09-09 sore: continue = `compHour` tidak di-nol; `CYLINDER HEAD` reseal; remark isi ulang; backfill bukan default New + Edit vs tombol update; non-APS boleh ke workshop APS.

Masih open:

1. **`dealerName`** — free text vs master?
2. **Hitung ulang produksi** saat LAN arka-docker nyambung — breakdown belum-submit vs sudah-submit tanpa category.
3. Keyword ID lain (`mesin`, `silinder`) selain yang sudah disebut?
