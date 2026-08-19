# Deploy package — ARKA PCR

Artefak untuk production Docker Compose di `/home/skyone/stack`.

| File | Fungsi |
|------|--------|
| `docker-compose.arka-pcr.snippet.yml` | Service `arka-pcr` + profile `tools` (gabungkan ke compose root) |
| `nginx/arka-pcr.conf` | Reverse proxy Nginx (file lengkap) |
| `env.production.example` | Template `.env` (hostname DB = `mysql`) |
| `mysql-init-arka-pcr.sql` | CREATE DATABASE + user |
| `backup-hooks.notes.md` | Integrasi `backup-mysql.sh` / `backup-web.sh` |

Panduan langkah: [`docs/deployment-docker-debian.md`](../docs/deployment-docker-debian.md)  
Akses yang dibutuhkan sebelum deploy: [`docs/deployment-access-checklist.md`](../docs/deployment-access-checklist.md)
