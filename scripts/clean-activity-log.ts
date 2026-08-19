/**
 * Hapus activity_log lebih tua dari N hari (default 365, Spatie activitylog:clean).
 * Manual: npm run activitylog:clean
 */
import { cleanActivityLogs } from '@/lib/activity-log/query'
import { prisma } from '@/lib/prisma'

async function main() {
  const days = Number(process.env.ACTIVITYLOG_CLEAN_AFTER_DAYS ?? '365')
  const cutoff = Number.isFinite(days) && days > 0 ? days : 365
  const deleted = await cleanActivityLogs(cutoff)
  console.log(`[activity-log] deleted ${deleted} row(s) older than ${cutoff} days`)
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
