/**
 * Kirim email due (life% >= 85) ke site dan overdue (life% >= 100) ke HO.
 *
 * Penjadwalan:
 * - Development (Windows): Task Scheduler
 *     Program: npx.cmd
 *     Arguments: tsx --env-file=.env.local scripts/notify-due-overdue.ts
 *     Trigger: Daily (e.g. 07:00)
 * - Production (Linux/Docker cron):
 *     0 7 * * * cd /app && npx tsx scripts/notify-due-overdue.ts >> /var/log/notify-due-overdue.log 2>&1
 *
 * Manual: npm run notify:due-overdue
 */
import { PrismaClient } from '@prisma/client'

import { getAppBaseUrl } from '@/lib/notifications/mailer'
import { wasNotifiedToday } from '@/lib/notifications/log'
import { notifyDueOverdue } from '@/lib/notifications/events'
import type { DueOverdueItem } from '@/lib/notifications/types'

const prisma = new PrismaClient()

/** Site: users with forecast access (project-scoped per project batch). */
const DUE_PERMISSIONS = ['forecasts.access', 'forecasts.update', 'forecasts.submit']

/** HO: director-level forecast approvers + system admin. */
const OVERDUE_PERMISSIONS = [
  'forecasts.approve.OD',
  'forecasts.approve.FD',
  'forecasts.approve.PD',
  'system.admin'
]

async function loadOpenForecastsByLife(minLife: number, maxLifeExclusive?: number) {
  return prisma.pcrForecast.findMany({
    where: {
      deletedAt: null,
      forecastStatus: 'OPEN',
      lifePercent: {
        gte: minLife,
        ...(maxLifeExclusive != null ? { lt: maxLifeExclusive } : {})
      }
    },
    select: {
      idForecast: true,
      unitNo: true,
      projectCode: true,
      compDesc: true,
      lifePercent: true
    },
    orderBy: [{ lifePercent: 'desc' }, { idForecast: 'asc' }],
    take: 500
  })
}

function toItems(
  rows: Array<{
    idForecast: number
    unitNo: string
    projectCode: string
    compDesc: string | null
    lifePercent: unknown
  }>,
  bucket: 'DUE' | 'OVERDUE'
): DueOverdueItem[] {
  const base = getAppBaseUrl()

  return rows.map(row => ({
    idForecast: row.idForecast,
    unitNo: row.unitNo,
    projectCode: row.projectCode,
    compDesc: row.compDesc,
    lifePercent: Number(row.lifePercent),
    bucket,
    detailUrl: `${base}/forecasts`
  }))
}

async function notifyBucket(
  bucket: 'DUE' | 'OVERDUE',
  items: DueOverdueItem[],
  permissionCodes: string[],
  projectScoped: boolean
) {
  if (items.length === 0) {
    console.log(JSON.stringify({ bucket, skipped: true, reason: 'no items' }))

    return
  }

  if (projectScoped) {
    const byProject = new Map<string, DueOverdueItem[]>()
    for (const item of items) {
      const list = byProject.get(item.projectCode) ?? []
      list.push(item)
      byProject.set(item.projectCode, list)
    }

    for (const [projectCode, projectItems] of byProject) {
      const dayKey = `due-overdue/${bucket}/${projectCode}/${new Date().toISOString().slice(0, 10)}`
      if (await wasNotifiedToday(dayKey)) {
        console.log(JSON.stringify({ bucket, projectCode, skipped: true, reason: 'already sent today' }))
        continue
      }

      const result = await notifyDueOverdue({
        bucket,
        items: projectItems,
        permissionCodes,
        projectCode
      })
      console.log(JSON.stringify({ bucket, projectCode, count: projectItems.length, ...result }))
    }

    return
  }

  const dayKey = `due-overdue/${bucket}/all/${new Date().toISOString().slice(0, 10)}`
  if (await wasNotifiedToday(dayKey)) {
    console.log(JSON.stringify({ bucket, skipped: true, reason: 'already sent today' }))

    return
  }

  const result = await notifyDueOverdue({
    bucket,
    items,
    permissionCodes,
    projectCode: null
  })
  console.log(JSON.stringify({ bucket, count: items.length, ...result }))
}

async function main() {
  // Due/critical: 85–99.99%; overdue: >= 100%
  const dueRows = await loadOpenForecastsByLife(85, 100)
  const overdueRows = await loadOpenForecastsByLife(100)

  await notifyBucket('DUE', toItems(dueRows, 'DUE'), DUE_PERMISSIONS, true)
  await notifyBucket('OVERDUE', toItems(overdueRows, 'OVERDUE'), OVERDUE_PERMISSIONS, false)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async err => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
