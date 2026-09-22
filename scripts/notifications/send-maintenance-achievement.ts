/**
 * Weekly Friday maintenance ACH digest — one email per site (TO plant, CC HO).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/notifications/send-maintenance-achievement.ts --dry-run
 *   npm run notify:maint-ach:docker -- --dry-run
 *   npm run notify:maint-ach:docker
 *
 * Env: MAINT_ACH_EMAIL_ENABLED=true required for live send (unless --force).
 * Also respects MAIL_ENABLED + SMTP_*.
 */
import {
  isMaintAchEmailEnabled,
  notifyMaintenanceAchievementDigest
} from '@/lib/notifications/events'

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name)
}

function readArg(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name)
  if (idx < 0) return undefined

  return argv[idx + 1]
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = hasFlag(argv, '--dry-run')
  const force = hasFlag(argv, '--force')
  const projectId = readArg(argv, '--project') ?? null
  const yearRaw = readArg(argv, '--year')
  const monthRaw = readArg(argv, '--month')

  console.log('[maint-ach] starting', {
    dryRun,
    force,
    projectId,
    MAINT_ACH_EMAIL_ENABLED: isMaintAchEmailEnabled()
  })

  const summary = await notifyMaintenanceAchievementDigest({
    dryRun,
    force,
    projectId,
    year: yearRaw ? Number.parseInt(yearRaw, 10) : undefined,
    month: monthRaw ? Number.parseInt(monthRaw, 10) : undefined
  })

  console.log('[maint-ach] week', summary.weekKey, 'sites', summary.sites, 'totals', summary.totals)
  for (const row of summary.results) {
    console.log(
      `  ${row.siteId}: ${row.skipped ?? (row.result?.ok ? (row.result.skipped ? 'mail_skipped' : 'sent') : 'failed')}`,
      `to=${row.to.length}`,
      `cc=${row.cc.length}`,
      row.subject ? `subject="${row.subject}"` : ''
    )
  }

  if (summary.totals.failed > 0) process.exitCode = 1
}

main().catch(err => {
  console.error('[maint-ach] fatal', err)
  process.exit(1)
})
