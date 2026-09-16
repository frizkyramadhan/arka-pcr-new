# Glossary — PCR supply kinds & policy profiles

> **Status**: Implemented 2026-09-15 (Location semua PCR Type; Lifetime Mode; Return To; Oldcore Status/Prediction). Recount produksi belum.  
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
| **Oldcore (bukti)** | Bukti fisik return core: tanggal + nomor SPB/BA. Wajib close Normal. Bukan klasifikasi core. |
| **Oldcore Status** | Kelas sisa hidup core: First Life 80% / Second Life 60% / Third Life 40%. Label bisnis saja. **Tidak** mengubah `lifePercent` / `compHour`. Wajib close Normal (termasuk WO tanpa forecast). Warranty close **tidak** memakai ini. |
| **Prediction Oldcore** | Prediksi kondisi core: Full Core / Partial Core / BER. BER **tetap boleh close**. Wajib close Normal (termasuk WO tanpa forecast). Warranty close **tidak** memakai ini. |
| **Location** | Tempat proses komponen: On Site atau Out Site. Wajib semua PCR Type **non-warranty**. Warranty skip. _Avoid_: Location hanya Repair. |
| **Destination** | Tujuan Out Site: APS (workshop Kariangau, tanpa nama) / Dealer (wajib nama) / Vendor OEM (tanpa nama). Wajib iff Out Site. On Site: absent. |
| **Component Grade** | Ex Repair atau Used. Hanya Out Site + APS. _Avoid_: grade di Dealer/OEM/On Site. |
| **Lifetime Mode** | Continue Life (life lanjut) atau Back to Zero (reset 0 saat close). Wajib PTA Reman, New Component, **dan** Repair. APS Used: **hanya** Continue Life. _Avoid_: Life Mode; `RETURN` sebagai mode life; PTA/New selalu reset 0. |
| **Return To** | Original Unit: komponen kembali ke unit forecast; convert/WO di unit forecast. **Other Unit (hanya Repair):** donor only; New/PTA dilarang. BA Kanibal wajib sebelum Submit BA PCR; **draft cukup**. Convert/WO di unit Other; `id_rep` forecast = `id_rep` baris INSTALL kanibal. WO `projectCode` = project unit Other (beda project boleh). `idMod` sama. Picker: semua project/unit. _Avoid_: Return sebagai Lifetime Mode; New/PTA + Other Unit; tunggu kanibal Fully Approved sebelum Submit BA PCR; WO di unit donor. |
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
| **`REPAIR`** | Repair / Perbaikan | Perbaikan komponen (bukan tukar reman, bukan new). |

Approval **diturunkan** dari kategori (bukan diisi user terpisah):

| Category | Approval profile | Label |
|----------|------------------|-------|
| `PTA_REMAN`, `NEW_COMPONENT` | **`FULL_TO_PD`** | Rantai penuh sampai PD |
| `REPAIR` | **`SHORT_TO_PLM`** | Rantai pendek sampai PLM |

Close **tidak** diturunkan dari approval. PTA, New, dan Repair memakai checklist Normal: MR + PR + PO + bukti oldcore + Oldcore Status + Prediction Oldcore (+ installation report jika MAJOR). WO tanpa forecast **sama**. Warranty = pendek + tanpa procurement + tanpa Status/Prediction.

---

## Location, destination, grade (semua PCR Type non-warranty)

Locked grill 2026-09-11. Location **satu makna** untuk PTA Reman, New Component, dan Repair: tempat proses.

| Enum / field | Label | Meaning |
|--------------|-------|---------|
| **Location** | On Site / Out Site | Tempat proses. Wajib non-warranty. |
| **On Site** | On Site | Proses di site. Destination, Component Grade **absent**. |
| **Out Site** | Out Site | Proses di luar site. Destination wajib. |
| **APS** | APS | Workshop Kariangau. Tanpa nama. Unit non-APS **boleh** Out Site ke sini. |
| **Dealer** | Dealer | Vendor/dealer. Nama dealer wajib. |
| **Vendor OEM** | Vendor OEM | Tujuan OEM. **Tanpa nama**. Bukan Dealer, bukan APS. |
| **Ex Repair** | Component Ex Repair | Grade APS. Lifetime Mode: Continue Life **atau** Back to Zero. |
| **Used** | Component Used | Grade APS. Lifetime Mode: **hanya** Continue Life. |

---

## Lifetime Mode & Return To (semua PCR Type non-warranty)

Wajib setelah Location (dan Destination/Grade jika tampil). Independen dari panjang rantai BA. Warranty skip.

| Enum | Label | Meaning |
|------|-------|---------|
| **`CONTINUE_LIFE`** | Continue Life | Life dan %life **lanjut**, bukan 0 saat close. Spawn: `compHour` tidak di-nol. |
| **`BACK_TO_ZERO`** | Back to Zero | Life / %life reset **0** saat close. Spawn: `compHour` 0. |
| **Original Unit** | Return To Original Unit | Komponen kembali ke unit forecast. |
| **Other Unit** | Return To Other Unit | Hanya Repair. Donor only. Submit BA PCR: taut BA Kanibal, draft cukup. Convert: WO di unit Other; `id_rep` = baris INSTALL. Beda project boleh. |

`RETURN` sebagai Lifetime Mode **dihapus**. Row lama `repairLifeMode=RETURN` di-remap diam: Continue Life + Return To Original Unit.

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
| **Life reset policy** | `CONTINUE_LIFE` / `BACK_TO_ZERO` | Semua PCR Type non-warranty. Continue: spawn **`compHour` tidak di-nol**. Back to Zero: `compHour: 0`. |
| **Return To** | Original Unit / Other Unit | Setelah Lifetime Mode. Other Unit = kanibal. |
| **Oldcore Status / Prediction** | kelas + prediksi core | Wajib close Normal (plus bukti date/SPB). Warranty close: **tidak**. |
| **Remarks hint** | Default Remark | Kata kunci; semua category; ganti komponen = isi ulang |

**Invarian grill (tetap):** pendeknya rantai approval **tidak** boleh otomatis menghilangkan procurement di close, dan **tidak** boleh otomatis mereset (atau tidak mereset) life.

---

## Entity / value objects & invariants

Konsep, bukan tabel. Nama field di ADR = rekomendasi, belum committed.

### ForecastCreate (aggregate)

- **Identity**: forecast yang akan punya `id_forecast`.
- **Required** (hanya jika `is_warranty = false`): `category` ∈ {`PTA_REMAN`, `NEW_COMPONENT`, `REPAIR`}.
- **Warranty create**: category PTA/New/Repair **absent**; rantai + close tetap aturan warranty lama.
- **Required nested (non-warranty)**: Location; Destination iff Out Site; Component Grade iff Out Site+APS; Lifetime Mode; Return To.
- **Derived**: `approvalProfile` dari category. Warranty bukan derived dari category.
- **Independent**: close profile vs approval vs Lifetime Mode.
- **Remark**: string; boleh terisi dari hints.

### Invariants

1. **Category required at create non-warranty.** Warranty **tanpa** PTA/New/Repair, Location, Destination, Grade, Lifetime Mode, Return To.
2. **Location on every non-warranty PCR Type.** On Site: Destination + Grade absent. Out Site: Destination wajib (APS / Dealer / Vendor OEM).
3. **`dealerName` required iff Out Site + Dealer.** APS dan Vendor OEM: nama absent. Unit non-APS boleh Out Site ke APS.
4. **Component Grade only Out Site + APS.** Ex Repair: Continue Life atau Back to Zero. Used: Continue Life only.
5. **Lifetime Mode independent of approval.** PTA/New **boleh** Continue Life. Jangan ikat reset ke rantai BA. Kode lama yang reset PTA/New selalu 0 **salah** setelah grill ini.
6. **Close independent of approval.** PTA/New/Repair **dan** WO tanpa forecast = checklist Normal (MR+PR+PO+bukti oldcore+Status+Prediction; report MAJOR). Warranty = tanpa procurement, tanpa Status/Prediction; report MAJOR. Status/Prediction **tidak** menggerakkan life. BER sah.
7. **Return To Other Unit = donor only, Repair only.** New/PTA wajib Original Unit. BA Kanibal (draft atau existing) wajib sebelum Submit BA PCR; **tidak** harus Fully Approved. Convert: replacement/WO di unit Other; `pcr_forecast.id_rep` **sama** dengan kanibal INSTALL `id_rep`. `projectCode` WO = unit Other. Convert gate = aturan convert forecast hari ini.
8. **`RETURN` life mode dihapus.** Row lama remap diam ke Continue Life + Original Unit.

```text
category required (non-warranty)
  Location required
    ├─ ON_SITE  → destination, grade absent
    └─ OUT_SITE → destination required
         ├─ APS    → grade Ex Repair | Used; nama absent
         ├─ DEALER → dealerName required; grade absent
         └─ VENDOR_OEM → nama absent; grade absent
  Lifetime Mode required (CONTINUE_LIFE | BACK_TO_ZERO; Used = CONTINUE_LIFE only)
  Return To required (ORIGINAL_UNIT | OTHER_UNIT)
```

---

## Warranty vs Repair (tetap penting)

| | **Warranty (hari ini)** | **Repair (stakeholder)** |
|--|-------------------------|--------------------------|
| Create | Tombol warranty tetap; **bukan** PTA/New/Repair | Hanya forecast **non-warranty** |
| Approval | PS → PM → PLM (`SHORT_TO_PLM`) | PS → PM → PLM (`SHORT_TO_PLM`) |
| Close | **Tanpa** MR/PR/PO/bukti oldcore/Status/Prediction; report jika MAJOR | **Sama** Normal: MR+PR+PO+bukti oldcore+Status+Prediction; report MAJOR |
| Life on close | Skip Lifetime Mode / Return To | `CONTINUE_LIFE` / `BACK_TO_ZERO` + Return To |
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
| Life reset | Spawn OPEN `compHour: 0` kecuali Continue Life | Continue Life: **jangan** nolkan `compHour`. Back to 0: 0. `RETURN` life mode dihapus. |
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

Terkunci 2026-09-15 (grill Other Unit + close oldcore selesai kecuali dealer master / recount produksi).

Sisa non-blocking:

1. **`dealerName`** — tetap free text (aturan lama) sampai ada master.
2. **Hitung ulang produksi** saat LAN arka-docker nyambung.
