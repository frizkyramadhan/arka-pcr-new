# =============================================================================
# Backup hooks — tambahkan ke script backup existing di server
# =============================================================================
# File ini adalah REFERENSI. Edit script asli:
#   /home/skyone/stack/backup/backup-mysql.sh
#   /home/skyone/stack/backup/backup-web.sh
# =============================================================================

# --- backup-mysql.sh (tambahan) ----------------------------------------------
# Pastikan database berikut ikut di-dump harian:
#   arka_pcr_new
# (opsional saat cutover) arka_pcr_legacy
#
# Contoh baris dump (sesuaikan user/password root MySQL di script Anda):
#
#   docker compose exec -T mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
#     --single-transaction --routines --triggers arka_pcr_new \
#     | gzip > "$BACKUP_DIR/arka_pcr_new_$(date +%Y%m%d).sql.gz"
#
# Upload FTP tetap ke: 192.168.32.37  /backup-146/database

# --- backup-web.sh (tambahan) ------------------------------------------------
# Tambahkan zip source aplikasi Next.js (bulanan), contoh:
#
#   APP_DIR="/home/skyone/stack/apps/app81/arka-pcr"
#   OUT="/home/skyone/stack/backup/web/arka-pcr.zip"
#   # Exclude node_modules, .next, uploads besar jika perlu
#   cd /home/skyone/stack/apps/app81
#   zip -r "$OUT" arka-pcr \
#     -x "arka-pcr/node_modules/*" \
#     -x "arka-pcr/.next/*" \
#     -x "arka-pcr/uploads/*"
#
# Upload FTP ke: /backup-146
#
# Catatan: jalankan sebagai root jika permission file dimiliki user Docker.
