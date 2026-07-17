/**
 * Ping SAP B1 Service Layer secara berkala dan simpan hasilnya ke `sap_health_check_log`
 * sebagai dasar banner in-app (GET /api/sap/health-status/latest).
 *
 * Penjadwalan:
 * - Development (Windows): Task Scheduler -> Action "Start a program"
 *     Program: npx.cmd  Arguments: tsx --env-file=.env.local scripts/sap-health-check.ts
 *     Trigger: Repeat every 5 minutes
 * - Production (Linux/Docker, cron), tiap 5 menit — crontab -e:
 *     * (slash) 5 * * * cd /app && npx tsx scripts/sap-health-check.ts >> /var/log/sap-health-check.log 2>&1
 *     (tulis ulang "(slash)" jadi karakter "/" saat menyalin ke crontab)
 *
 * Manual run: npm run sap:health-check
 */
import { PrismaClient } from '@prisma/client'

import { pingSapB1 } from '@/lib/sap-b1/client'

const prisma = new PrismaClient()

/** Retensi log — hapus baris lebih tua dari ini supaya tabel tidak membesar tanpa batas. */
const RETENTION_DAYS = 30

async function pruneOldLogs() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  await prisma.sapHealthCheckLog.deleteMany({
    where: { checkedAt: { lt: cutoff } }
  })
}

async function main(): Promise<boolean> {
  await pruneOldLogs()

  const startedAt = Date.now()
  const result = await pingSapB1()
  const latencyMs = Date.now() - startedAt

  await prisma.sapHealthCheckLog.create({
    data: {
      isHealthy: result.ok,
      latencyMs,
      errorMessage: result.ok ? null : result.error ?? 'Unknown SAP B1 error'
    }
  })

  console.log(
    JSON.stringify(
      { ok: result.ok, enabled: result.enabled, configured: result.configured, latencyMs, error: result.error },
      null,
      2
    )
  )

  return result.ok
}

main()
  .then(async ok => {
    await prisma.$disconnect()
    process.exit(ok ? 0 : 1)
  })
  .catch(async error => {
    console.error(error instanceof Error ? error.message : error)
    await prisma.$disconnect()
    process.exit(1)
  })
