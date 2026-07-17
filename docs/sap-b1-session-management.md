# SAP B1 Service Layer — Session Management (ARKA PCR)

Dokumen ini menjelaskan bagaimana **ARKA PCR (Next.js)** mengelola session SAP Business One Service Layer untuk lookup P/N cannibal. Pola ini diadaptasi dari aplikasi Laravel internal (Guzzle + CookieJar).

---

## Ringkasan

SAP B1 Service Layer memakai **cookie-based session**, bukan Bearer token atau session ID di header/query.

| Mekanisme                             | Dipakai? |
| ------------------------------------- | -------- |
| HTTP Cookies (`B1SESSION`, `ROUTEID`) | ✅ Ya    |
| Session ID di header/query            | ❌ Tidak |
| Bearer token                          | ❌ Tidak |

Setelah login sukses, SAP mengirim `Set-Cookie`. Semua request berikutnya **wajib** menyertakan cookie di header `Cookie`.

---

## Mapping Laravel → ARKA PCR

| Laravel (Guzzle)              | ARKA PCR (Next.js)                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `GuzzleHttp\Cookie\CookieJar` | [`lib/sap-b1/cookie-jar.ts`](../lib/sap-b1/cookie-jar.ts) — singleton `sapB1CookieJar` |
| `SapService` singleton        | Module singleton di [`lib/sap-b1/session.ts`](../lib/sap-b1/session.ts)                |
| `$client->post('Login', ...)` | `sapB1Fetch('/Login', { method: 'POST', body: {...} })`                                |
| Cookie otomatis di request    | `sapB1AuthorizedJson()` / `sapB1AuthorizedFetch()`                                     |
| Re-login on 401 + retry       | `authorizedFetchWithRetry()` — max 1 retry                                             |
| `$this->cookieJar->count()`   | `sapB1CookieJar.count` / `hasValidSession()`                                           |
| `ensureSession()`             | `ensureSession()` — login hanya jika session invalid/expired                           |
| `app/Services/SapService.php` | `lib/sap-b1/*` + `src/app/api/sap/*`                                                   |

---

## Arsitektur

```mermaid
sequenceDiagram
  participant Browser as Browser_ARAKA
  participant API as NextJS_API
  participant Session as lib_sap_b1_session
  participant Jar as sapB1CookieJar
  participant SL as SAP_ServiceLayer

  Browser->>API: GET /api/sap/materials?q=PN
  Note over Browser,API: Auth NextAuth — no SAP creds
  API->>Session: searchMaterials()
  Session->>Session: ensureSession()
  alt no valid B1SESSION
    Session->>SL: POST /Login
    SL-->>Session: Set-Cookie B1SESSION + ROUTEID
    Session->>Jar: ingestSetCookieHeaders()
  end
  Session->>SL: GET /Items?$filter=...
  Note over Session,SL: Cookie: B1SESSION=...; ROUTEID=...
  alt HTTP 401
    Session->>Session: invalidateSapB1Session()
    Session->>SL: POST /Login then retry GET
  end
  SL-->>API: OData JSON
  API-->>Browser: { data: [{ pn, compDesc }] }
```

### Lapisan file

| File                                                                                                        | Peran                                       |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`lib/sap-b1/config.ts`](../lib/sap-b1/config.ts)                                                           | Env `SAP_B1_*`, TLS, item group codes       |
| [`lib/sap-b1/cookie-jar.ts`](../lib/sap-b1/cookie-jar.ts)                                                   | Simpan & kirim `B1SESSION` + `ROUTEID`      |
| [`lib/sap-b1/fetch.ts`](../lib/sap-b1/fetch.ts)                                                             | HTTP ke Service Layer (`node:https`)        |
| [`lib/sap-b1/session.ts`](../lib/sap-b1/session.ts)                                                         | Login, `ensureSession()`, 401 retry, logout |
| [`lib/sap-b1/items-service.ts`](../lib/sap-b1/items-service.ts)                                             | Query entity `Items` (lookup P/N)           |
| [`lib/sap-b1/client.ts`](../lib/sap-b1/client.ts)                                                           | Public API + `pingSapB1()`                  |
| [`src/app/api/sap/materials/route.ts`](../src/app/api/sap/materials/route.ts)                               | Proxy ke browser (auth ARKA wajib)          |
| [`src/app/api/sap/health/route.ts`](../src/app/api/sap/health/route.ts)                                     | Health check + item groups discovery        |
| [`src/views/pcr/cannibal/SapMaterialAutocomplete.js`](../src/views/pcr/cannibal/SapMaterialAutocomplete.js) | UI autocomplete P/N                         |

---

## Alur session (detail)

### 1. Login

```http
POST https://arkasrv2:50000/b1s/v1/Login
Content-Type: application/json

{
  "CompanyDB": "SBO_ARKA_NEW",
  "UserName": "manager",
  "Password": "..."
}
```

Response sukses:

```http
HTTP/1.1 200 OK
Set-Cookie: B1SESSION=abc123...; Path=/; HttpOnly
Set-Cookie: ROUTEID=.node1; Path=/
Content-Type: application/json

{ "SessionId": "...", "SessionTimeout": 30, "Version": "..." }
```

Implementasi (`session.ts` → `login()`):

1. `sapB1CookieJar.clear()`
2. `POST /Login` via `sapB1Fetch`
3. `sapB1CookieJar.ingestSetCookieHeaders(res.headers)`
4. Validasi `B1SESSION` ada
5. Set `expiresAt` dari `SessionTimeout` (buffer 5 menit sebelum timeout SAP)

### 2. Request berikutnya

```http
GET https://arkasrv2:50000/b1s/v1/Items?$select=ItemCode,ItemName&$top=20
Cookie: B1SESSION=abc123...; ROUTEID=.node1
```

Cookie header dibangun otomatis oleh `sapB1CookieJar.toCookieHeader()`. Response SAP yang mengirim `Set-Cookie` baru di-merge ke jar.

### 3. Session expired (401)

SAP mengembalikan `401 Unauthorized` (code 301: "Invalid session or session already timeout").

ARKA PCR:

1. `invalidateSapB1Session()` — clear jar + expiry cache
2. `login()` ulang
3. Retry request **sekali**
4. Jika masih gagal → error generic ke client

---

## API publik session

```typescript
import {
  ensureSession,
  hasValidSession,
  invalidateSapB1Session,
  logoutSapB1Session,
  sapB1AuthorizedJson,
  getSapB1SessionDebugInfo
} from '@/lib/sap-b1/session'

// Login hanya jika perlu (disarankan sebelum request SAP)
await ensureSession()

// Cek tanpa login
if (!hasValidSession()) {
  /* ... */
}

// Request dengan cookie + retry 401
const data = await sapB1AuthorizedJson('/Items?$top=1')

// Debug (tanpa expose nilai cookie)
const info = getSapB1SessionDebugInfo()
// { cookieCount: 2, hasSession: true, expiresAt: 1730000000000 }
```

### Login deduplication

Request paralel (mis. banyak user ketik P/N bersamaan) tidak memicu banyak login SAP:

- `loginPromise` — hanya satu login in-flight
- `sapB1CookieJar` singleton — satu session per proses Node.js

Setara rekomendasi Laravel: `AppServiceProvider::singleton(SapService::class)`.

---

## Keamanan credential

Password SAP **tidak pernah** muncul di browser, console client, atau Network tab.

| Aturan           | Implementasi                                                  |
| ---------------- | ------------------------------------------------------------- |
| Server-side only | Env `SAP_B1_*` **tanpa** prefix `NEXT_PUBLIC_`                |
| Penyimpanan      | Password hanya di `.env.local` (gitignored via `.env*.local`) |
| Proxy wajib      | Browser → `/api/sap/materials` saja, bukan ke host SAP        |
| Cookie SAP       | `B1SESSION` in-memory di server Node.js, tidak ke client      |
| Response API     | Hanya `{ pn, compDesc }[]` — tanpa raw SAP payload            |
| Error ke client  | Generic: "SAP material lookup is temporarily unavailable"     |
| Logging          | Jangan log password atau body login                           |

---

## Konfigurasi env

Template: [`.env.example`](../.env.example). Credential lengkap: **`.env.local` saja**.

```env
SAP_B1_BASE_URL="https://arkasrv2:50000/b1s/v1"
SAP_B1_COMPANY_DB="SBO_ARKA_NEW"
SAP_B1_USER="manager"
SAP_B1_PASSWORD=""                    # hanya di .env.local
SAP_B1_ENABLED="true"
SAP_B1_ITEM_GROUP_CODES="114"         # spare parts; kosong = semua item aktif
SAP_B1_TLS_REJECT_UNAUTHORIZED="false" # self-signed / internal CA
SAP_B1_TIMEOUT_MS="15000"
```

| Variabel                         | Fungsi                                                 |
| -------------------------------- | ------------------------------------------------------ |
| `SAP_B1_BASE_URL`                | Host + port + path API (`/b1s/v1` atau `/b1s/v2`)      |
| `SAP_B1_COMPANY_DB`              | Nama database B1 (CompanyDB saat login)                |
| `SAP_B1_ITEM_GROUP_CODES`        | Filter spare parts (`ItemsGroupCode`), comma-separated |
| `SAP_B1_ENABLED`                 | `false` = lookup nonaktif, form tetap manual           |
| `SAP_B1_TLS_REJECT_UNAUTHORIZED` | `false` = terima cert self-signed                      |

---

## Lookup P/N cannibal

### API route

`GET /api/sap/materials?q={query}&limit={n}`

- Auth: session NextAuth wajib (`requireSession`)
- Min query: 2 karakter
- Response: `{ data: [{ pn, compDesc }], source: 'sap-b1' }`

### UI

[`CannibalTransferForm.js`](../src/views/pcr/cannibal/CannibalTransferForm.js) memakai `SapMaterialAutocomplete`:

- Debounce 350ms → fetch `/api/sap/materials`
- Pilih item → auto-fill `pn` + `compDesc`
- `freeSolo` — fallback manual jika SAP down

### OData filter (Items)

Dibangun di [`lib/sap-b1/odata.ts`](../lib/sap-b1/odata.ts):

- Search: `startswith(ItemCode,...)` OR `contains(ItemName,...)` OR `contains(ForeignName,...)`
- Active only: `Valid eq 'tYES'` AND `Frozen eq 'tNO'`
- Spare parts: `ItemsGroupCode eq {code}` (dari env)

---

## Debugging & smoke test

### CLI

```bash
npm run sap:ping
```

Contoh sukses:

```json
{
  "ok": true,
  "enabled": true,
  "configured": true,
  "session": { "cookieCount": 2, "hasSession": true, "expiresAt": 1730000000000 },
  "itemCount": 1,
  "itemGroups": [{ "code": 114, "name": "Spare Parts" }]
}
```

### API health (auth ARKA)

```http
GET /api/sap/health
```

### curl manual (dari server yang reach SAP)

```bash
# 1. Login
curl -k -c cookies.txt -X POST "https://arkasrv2:50000/b1s/v1/Login" \
  -H "Content-Type: application/json" \
  -d '{"CompanyDB":"SBO_ARKA_NEW","UserName":"manager","Password":"..."}'

# 2. Sample items
curl -k -b cookies.txt \
  "https://arkasrv2:50000/b1s/v1/Items?\$top=3&\$select=ItemCode,ItemName,ItemsGroupCode"

# 3. Logout
curl -k -b cookies.txt -X POST "https://arkasrv2:50000/b1s/v1/Logout"
```

---

## Multiple applications (Laravel + ARKA PCR)

Beberapa aplikasi boleh memakai credential SAP yang sama:

- Masing-masing dapat **session independen** (cookie berbeda)
- ARKA PCR hanya **read** entity `Items` — risiko konflik data rendah
- Perhatikan **session limit** SAP (~5–10 concurrent session per user)

ARKA PCR sudah memakai singleton session reuse untuk meminimalkan jumlah login.

| Aspek           | Perilaku                            | Risiko               |
| --------------- | ----------------------------------- | -------------------- |
| Session per app | Independent                         | Rendah               |
| Concurrent read | Diizinkan                           | Rendah               |
| Session limit   | Bisa tercapai jika banyak app login | Sedang               |
| Write conflict  | Last write wins (ARKA tidak write)  | N/A untuk lookup P/N |

---

## Troubleshooting

| Masalah               | Penyebab                      | Solusi                                                            |
| --------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `401 Unauthorized`    | Session expired               | Otomatis re-login; cek `npm run sap:ping`                         |
| Timeout               | Host SAP tidak reachable      | VPN/jaringan; pastikan DNS `arkasrv2` resolve                     |
| Login gagal           | CompanyDB/user/password salah | Cek `.env.local`                                                  |
| Lookup kosong         | Filter grup salah             | Cek `SAP_B1_ITEM_GROUP_CODES`; discovery via `itemGroups` di ping |
| UI "SAP unavailable"  | SAP down atau disabled        | Cek `SAP_B1_ENABLED`; ketik P/N manual (freeSolo)                 |
| Cookie tidak terkirim | Bypass session layer          | Pastikan pakai `sapB1AuthorizedJson`, bukan `sapB1Fetch` langsung |

---

## Unit tests

```bash
npm test -- tests/lib/sap-b1/
```

| File                                     | Cakupan                                 |
| ---------------------------------------- | --------------------------------------- |
| `tests/lib/sap-b1/cookie-jar.test.ts`    | Parse `Set-Cookie`, merge, clear        |
| `tests/lib/sap-b1/odata.test.ts`         | OData `$filter` builder + mapper        |
| `tests/lib/sap-b1/items-service.test.ts` | `searchMaterials()` dengan mock session |

---

## Referensi

- [SAP B1 Service Layer API Reference (10.0)](https://help.sap.com/doc/056f69366b5345a386bb8149f1700c19/10.0/en-US/Service%20Layer%20API%20Reference.html)
- Dokumen asli Laravel: `SAP-B1-SESSION-MANAGEMENT.md` (WhatsApp transfer — referensi pola CookieJar)
- Plan implementasi: lookup P/N cannibal via entity `Items` (OITM)
