# Checklist akses — agar AI / DevOps bisa deploy ke server

Dokumen ini menjelaskan **apa yang harus Anda berikan** sebelum instruksi **"deploy ke server"** bisa dieksekusi. Tanpa item wajib, deploy tidak bisa dilanjutkan dengan aman.

---

## A. Akses server (wajib)

| Item | Contoh | Keterangan |
|------|--------|------------|
| Host / IP SSH | `192.168.x.x` atau hostname | Server Debian Docker Compose |
| Port SSH | `22` (atau custom) | |
| Username SSH | `skyone` atau user lain | User yang bisa `docker compose` |
| Autentikasi | Private key **atau** password | Key lebih aman; jika key, path/isi key + passphrase jika ada |
| `sudo` / root | Ya/Tidak | Dibutuhkan jika edit backup script / permission uploads milik root |
| Path stack | `/home/skyone/stack` | Konfirmasi jika berbeda |

**Cara aman memberikan akses ke Cursor agent:**

1. **Disarankan:** SSH key khusus deploy (tanpa password login interaktif), user yang punya akses Docker.
2. Simpan di mesin Anda, lalu pastikan agent bisa memakai SSH (mis. `ssh skyone@HOST` dari terminal Cursor tanpa prompt interaktif).
3. **Jangan** paste password root di chat jika bisa dihindari — gunakan key + `ssh-agent`, atau secrets manager.

---

## B. Informasi Docker Compose yang sudah jalan (wajib)

Saya **tidak** punya salinan live `docker-compose.yml` server Anda. Perlu:

| Item | Keterangan |
|------|------------|
| Isi / cuplikan `docker-compose.yml` | Minimal: networks (`appnet`), service `mysql`, `nginx`, contoh service Node existing (`arka-fms` jika ada) |
| Nama network pasti | Konfirmasi `appnet` |
| Hostname MySQL di network | Konfirmasi `mysql` |
| Port Nginx publik | 80 / 8080 / 8081 — mana yang dipakai untuk PCR |
| `server_name` / URL publik PCR | Mis. `pcr.arka.local` atau `http://192.168.x.x:8080` |

Opsional tapi sangat membantu:

- Contoh `Dockerfile` + service `arka-fms` (agar saya samakan pola 1:1)
- Satu file nginx existing di `nginx/conf.d/` sebagai referensi style

---

## C. Database (wajib)

| Item | Keterangan |
|------|------------|
| Boleh buat DB baru? | `arka_pcr_new` (+ opsional `arka_pcr_legacy`) |
| Kredensial MySQL | Root **atau** user yang bisa `CREATE DATABASE` / `GRANT` |
| Password untuk `pcr_user` | Anda tentukan (saya generate jika diminta) |
| Lokasi legacy DB saat ini | Host/DB name aplikasi PCR lama (untuk dump cutover) |

---

## D. Source code & git (wajib salah satu)

| Opsi | Keterangan |
|------|------------|
| **A. Git remote** | URL repo + branch + akses clone di server (deploy key / token) |
| **B. Rsync/SCP dari laptop** | Saya push file dari workspace lokal ke server via SCP/rsync |

Konfirmasi nama folder target:

```text
/home/skyone/stack/apps/app81/arka-pcr
```

(atau path lain yang Anda tentukan)

---

## E. Keputusan go-live (wajib sebelum cutover data)

| Keputusan | Pilihan |
|-----------|---------|
| Mode deploy pertama | **App only** (schema + seed, tanpa data legacy dulu) **atau** **Full cutover** (freeze legacy + remigrasi) |
| Freeze legacy | Tanggal/jam maintenance window |
| URL produksi | HTTP atau HTTPS |
| `JWT_COOKIE_SECURE` | `false` jika HTTP |
| Fleet API reachable dari container? | Ya/Tidak (firewall) |
| SAP B1 di production hari-1? | On / Off (default Off di template) |

---

## F. Backup (disarankan)

| Item | Keterangan |
|------|------------|
| Izin edit `backup-mysql.sh` / `backup-web.sh` | Agar `arka_pcr_new` + `arka-pcr.zip` ikut backup |
| Kredensial FTP backup | Sudah ada di script — konfirmasi tidak perlu diubah |

---

## G. Yang sudah disiapkan di repo (tidak perlu Anda buat ulang)

| Artefak | Path |
|---------|------|
| Dockerfile | `Dockerfile` |
| Entrypoint migrate | `docker/entrypoint.sh` |
| Compose snippet | `deploy/docker-compose.arka-pcr.snippet.yml` |
| Nginx conf | `deploy/nginx/arka-pcr.conf` |
| Env template | `deploy/env.production.example` |
| MySQL init SQL | `deploy/mysql-init-arka-pcr.sql` |
| Panduan langkah | `docs/deployment-docker-debian.md` |
| Catatan backup | `deploy/backup-hooks.notes.md` |

---

## H. Minimum untuk saya mulai deploy

Kirim / sediakan **setidaknya**:

1. SSH host + user + key/password (non-interaktif dari terminal Cursor)
2. Konfirmasi path `/home/skyone/stack`
3. Cuplikan `docker-compose.yml` (network + mysql + nginx)
4. URL / `server_name` yang diinginkan
5. Password MySQL untuk buat DB/user **atau** buat DB sendiri lalu kasih `DATABASE_URL`
6. Mode: **app-only dulu** atau **langsung cutover + migrasi**
7. Instruksi eksplisit: **"deploy ke server"**

Setelah itu saya akan:

1. Clone/rsync source ke `apps/app81/arka-pcr`
2. Pasang `.env`, nginx conf, merge compose
3. Build & up container
4. `prisma migrate deploy` + seed
5. Smoke test `/login`
6. (Jika cutover) dump legacy + pipeline migrasi — **hanya setelah freeze disepakati**
