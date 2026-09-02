# Deployment ARKA PCR — Docker Compose di Debian (`/home/skyone/stack`)

**Status artefak:** siap di repo — eksekusi ke server menunggu instruksi **"deploy ke server"** + akses (lihat `docs/deployment-access-checklist.md`).

**Jenis aplikasi:** Next.js 13 + Prisma → **container Node.js sendiri** (bukan `php74` / `php81` / `php82`).

**Pola acuan stack:** sama seperti aplikasi Next.js lain di server (contoh: `apps/app81/arka-fms`).

---

## 1. Ringkasan arsitektur di server

```text
Browser → nginx (appnet) → arka-pcr:3000
                ↓
              mysql:3306  (DATABASE_URL host = mysql)
```

| Komponen | Path / nama |
|----------|-------------|
| Source | `/home/skyone/stack/apps/app81/arka-pcr` |
| Service Compose | `arka-pcr` |
| Network | `appnet` |
| DB | `arka_pcr_new` @ hostname `mysql` |
| Uploads | `./apps/app81/arka-pcr/uploads` → `/app/uploads` |
| Nginx conf | `/home/skyone/stack/nginx/conf.d/arka-pcr.conf` |

---

## 2. Artefak di repository

| File | Fungsi |
|------|--------|
| `Dockerfile` | Multi-stage build, Next standalone, Prisma |
| `docker/entrypoint.sh` | `prisma migrate deploy` lalu `node server.js` |
| `.dockerignore` | Context build ramping |
| `deploy/docker-compose.arka-pcr.snippet.yml` | Blok service lengkap untuk digabung ke compose |
| `deploy/nginx/arka-pcr.conf` | Upstream `arka_pcr_upstream` saja |
| `deploy/nginx/arka-pcr-site-locations.snippet` | `location /arka-pcr/` untuk dimasukkan ke `site.conf` |
| `deploy/env.production.example` | Template `.env` (hostname `mysql`) |
| `deploy/mysql-init-arka-pcr.sql` | CREATE DATABASE + user |
| `deploy/backup-hooks.notes.md` | Integrasi backup-mysql / backup-web |
| `docs/deployment-access-checklist.md` | Apa yang harus diberikan sebelum deploy |

---

## 3. Langkah demi langkah (production)

Jalankan di server setelah source ada di `apps/app81/arka-pcr`.

### 3.1 Clone / salin source

```bash
cd /home/skyone/stack/apps/app81
# Opsi A — git
git clone <REPO_URL> arka-pcr
cd arka-pcr
git checkout <BRANCH>

# Opsi B — rsync dari workstation (contoh)
# rsync -avz --exclude node_modules --exclude .next ./arka-pcr-new/ skyone@SERVER:/home/skyone/stack/apps/app81/arka-pcr/
```

### 3.2 Environment

```bash
cd /home/skyone/stack/apps/app81/arka-pcr
cp deploy/env.production.example .env
# Edit .env: AUTH_SECRET, DATABASE_URL (@mysql), AUTH_URL=http://<host>/arka-pcr, NEXTAUTH_URL=http://<host>/arka-pcr/api/auth, JWT_COOKIE_SECURE
openssl rand -base64 32   # tempel ke AUTH_SECRET
mkdir -p uploads
```

**Wajib:** `DATABASE_URL=mysql://pcr_user:...@mysql:3306/arka_pcr_new`

### 3.3 Database

```bash
cd /home/skyone/stack
# Sesuaikan password di SQL dulu
docker compose exec -T mysql mysql -uroot -p < apps/app81/arka-pcr/deploy/mysql-init-arka-pcr.sql
```

### 3.4 Gabungkan service ke `docker-compose.yml`

1. Buka `/home/skyone/stack/docker-compose.yml`
2. Tambahkan service dari `deploy/docker-compose.arka-pcr.snippet.yml` (isi lengkap ada di file itu)
3. Pastikan `networks: appnet` dan `depends_on: mysql` selaras dengan stack existing
4. **Jangan** ubah service PHP kecuali diperlukan

### 3.5 Nginx (subpath `/arka-pcr`)

Aplikasi di-build dengan `NEXT_PUBLIC_BASE_PATH=/arka-pcr` (lihat `deploy/docker-compose.arka-pcr.snippet.yml`).
URL publik: `http://<host>/arka-pcr/` — set:
- `AUTH_URL=http://<host>/arka-pcr` (email / deep link app)
- `NEXTAUTH_URL=http://<host>/arka-pcr/api/auth` (**wajib** `/api/auth`; jangan hanya `/arka-pcr` — menyebabkan URL dobel)

```bash
# Upstream saja (jangan pakai server { } terpisah di port 80)
cp /home/skyone/stack/apps/app81/arka-pcr/deploy/nginx/arka-pcr.conf \
   /home/skyone/stack/nginx/conf.d/arka-pcr.conf

# Salin blok location dari arka-pcr-site-locations.snippet ke server { } di site.conf
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

### 3.6 Build & jalankan

```bash
cd /home/skyone/stack
docker compose build arka-pcr
docker compose up -d arka-pcr
docker compose logs -f arka-pcr
```

Entrypoint otomatis menjalankan `npx prisma migrate deploy`.

### 3.7 Seed RBAC + admin (sekali)

Pakai profile Compose **`tools`** (stage Dockerfile `tools` — full source + `node_modules` + `tsx`):

```bash
cd /home/skyone/stack
docker compose --profile tools build arka-pcr-tools
docker compose --profile tools run --rm arka-pcr-tools "npm run db:seed:docker"
# atau: npm run rbac:seed — jika script tidak memakai --env-file=.env.local
```

Pastikan `.env` `DATABASE_URL` memakai host `mysql`.

### 3.8 Fleet sync

```bash
cd /home/skyone/stack
docker compose --profile tools run --rm arka-pcr-tools "npm run fleet:sync:docker"
```

Untuk cron harian nanti: jadwalkan perintah yang sama dari crontab host.

### 3.9 Testing

```bash
curl -I http://127.0.0.1/login          # atau port nginx yang dipakai
docker compose ps arka-pcr
docker compose logs --tail=100 arka-pcr
```

Checklist UI:

1. Halaman login terbuka
2. Login admin
3. Units / Fleet terlihat setelah sync
4. Upload PDF WO (cek file di `uploads/`)
5. Export Excel

### 3.10 Backup

Ikuti `deploy/backup-hooks.notes.md` — pastikan `arka_pcr_new` masuk dump harian dan `arka-pcr.zip` masuk backup web bulanan.

---

## 4. Remigrasi data legacy (cutover)

**Jangan** anggap data staging Laragon = production.

1. Sepakati maintenance window → **freeze write** di aplikasi legacy
2. Dump fresh legacy → import ke `arka_pcr_legacy`
3. Siapkan `unit-mapping.csv` / `model-mapping.csv` terbaru
4. Jalankan pipeline `npm run migrate:run-staging` dari host/ops Node dengan:

   - `DATABASE_URL` → `arka_pcr_new` (@mysql atau @127.0.0.1)
   - `LEGACY_DATABASE_URL` → `arka_pcr_legacy`

5. Validasi `COUNT(*)` vs legacy
6. Go-live Nginx; legacy read-only

Detail tabel & urutan: `docs/legacy-data-migration-plan.md`.

---

## 5. Alasan konfigurasi penting

| Keputusan | Alasan |
|-----------|--------|
| Container Node terpisah | Next.js bukan PHP-FPM |
| Hostname DB `mysql` | Resolusi DNS Docker Compose di `appnet` |
| `output: 'standalone'` | Image lebih kecil, proses `node server.js` jelas |
| Volume `uploads` | PDF WO tidak hilang saat recreate |
| `migrate deploy` di entrypoint | Schema selalu selaras saat deploy image baru |
| Nginx reverse proxy | Satu pintu HTTP seperti app lain di stack |
| `JWT_COOKIE_SECURE=false` pada HTTP | Cegah redirect loop login tanpa TLS |

---

## 6. Rollback singkat

```bash
cd /home/skyone/stack
docker compose stop arka-pcr
# Hapus/rename nginx conf → reload nginx
# Restore DB dari backup SQL.gz jika migrasi data bermasalah
```

---

## 7. Known gap ops (diterima untuk v1 deploy)

| Gap | Mitigasi sementara |
|-----|--------------------|
| Seed/fleet sync tidak di image `runner` | Profile Compose `tools` (`arka-pcr-tools`) |
| Cron `fleet:sync` | Cron host → `docker compose --profile tools run --rm ...` |
| Compose live server belum digabung otomatis | Merge manual snippet saat deploy |

Setelah akses server tersedia dan Anda bilang **"deploy ke server"**, langkah 3.x dieksekusi langsung di mesin produksi.
