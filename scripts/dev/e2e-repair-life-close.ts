/**
 * E2E: forecast → submit BA → approve → convert → close — verify repair life mode on close.
 * Usage: tsx --env-file=.env.local scripts/dev/e2e-repair-life-close.ts
 */
process.env.ACL_ENABLED = 'false'

import fs from 'fs'
import path from 'path'

import type { Session } from 'next-auth'

import { buildForecastSnapshot } from '@/lib/forecasts/build-snapshot'
import { isUnderPolicy } from '@/lib/forecasts/warranty'
import {
  approveForecastLevel,
  convertForecastToReplacement,
  createForecast,
  getForecastById,
  submitForecastBa
} from '@/lib/forecasts/service'
import { closeReplacement, uploadReplacementReport } from '@/lib/replacement/service'
import { findSpawnedOpenAfterClose } from '@/lib/replacement/reconcile'
import { getCurrentPendingPcrLevel } from '@/lib/forecasts/approval-workflow'
import { forecastApprovalContextFrom } from '@/lib/approval/registry'
import { carriesCompHourOnSpawn, resetClosedLifeOnClose } from '@/lib/replacement/close-life-policy'
import { prisma } from '@/lib/prisma'
import { getUserProjectCodes } from '@/lib/rbac/user-projects'
import { getUserRolesAndPermissions } from '@/lib/rbac/defaults'

type Scenario = {
  label: string
  idRep: number
  isWarranty: boolean
  pcrSupplyCategory?: 'REPAIR'
  repairSite?: 'ON_SITE'
  repairLifeMode?: 'CONTINUE_LIFE' | 'BACK_TO_ZERO'
}

type StepLog = {
  step: string
  ok: boolean
  detail?: string
}

type ScenarioResult = {
  scenario: Scenario
  idForecast?: number
  closedIdRep?: number
  spawnedIdRep?: number
  beforeCompHour?: number
  closedCompLife?: number | null
  closedLifePercent?: number | null
  spawnCompHour?: number | null
  steps: StepLog[]
  error?: string
}

async function buildAdminSession(): Promise<{ session: Session; userId: number }> {
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { idUser: 'asc' }
  })

  if (!user) throw new Error('No active user in database')

  const [projectCodes, { roleNames, permissions }] = await Promise.all([
    getUserProjectCodes(user.idUser),
    getUserRolesAndPermissions(user.idUser)
  ])

  const session: Session = {
    user: {
      id: String(user.idUser),
      name: user.fullName,
      email: user.email,
      projectCodes,
      roles: roleNames,
      permissions: [...permissions, 'system.admin']
    },
    expires: ''
  }

  return { session, userId: user.idUser }
}

async function findCandidates(): Promise<{
  warranty: { idRep: number; fleetUnitId: number; idMod: number; lifePercent: number; compHour: number } | null
  repairRows: Array<{ idRep: number; fleetUnitId: number; idMod: number; compHour: number; unitNo: string; compDesc: string }>
}> {
  const openRows = await prisma.replacement.findMany({
    where: {
      woStatus: 'OPEN',
      deletedAt: null,
      compHour: { gt: 500 }
    },
    include: {
      commod: { include: { comp: true } }
    },
    orderBy: { compHour: 'desc' },
    take: 80
  })

  const linkedIds = new Set(
    (
      await prisma.pcrForecast.findMany({
        where: { deletedAt: null, idRep: { not: null } },
        select: { idRep: true }
      })
    )
      .map(row => row.idRep)
      .filter((id): id is number => id != null)
  )

  const free = openRows.filter(row => !linkedIds.has(row.idRep))

  let warrantyMeta: {
    idRep: number
    fleetUnitId: number
    idMod: number
    lifePercent: number
    compHour: number
  } | null = null

  for (const row of free) {
    const snapshot = await buildForecastSnapshot(row.fleetUnitId, row.idMod)
    if (isUnderPolicy(snapshot.lifePercent)) {
      warrantyMeta = {
        idRep: row.idRep,
        fleetUnitId: row.fleetUnitId,
        idMod: row.idMod,
        lifePercent: snapshot.lifePercent,
        compHour: Number(row.compHour ?? 0)
      }
      break
    }
  }

  const repairRows = free
    .filter(row => row.idRep !== warrantyMeta?.idRep)
    .slice(0, 4)
    .map(row => ({
      idRep: row.idRep,
      fleetUnitId: row.fleetUnitId,
      idMod: row.idMod,
      compHour: Number(row.compHour ?? 0),
      unitNo: row.unitNo ?? '',
      compDesc: row.commod?.comp?.compDesc ?? ''
    }))

  return { warranty: warrantyMeta, repairRows }
}

function dummyPdfFile(): File {
  const bytes = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
  const blob = new Blob([bytes], { type: 'application/pdf' })

  return new File([blob], 'e2e-install-report.pdf', { type: 'application/pdf' })
}

async function approveAllPending(session: Session, idForecast: number, userId: number) {
  for (let guard = 0; guard < 12; guard += 1) {
    const forecast = await getForecastById(session, idForecast)
    if (!forecast?.approvals?.length) break

    const ctx = forecastApprovalContextFrom(forecast)
    const level = getCurrentPendingPcrLevel(forecast.approvals, ctx)
    if (!level) break

    const pending = forecast.approvals.find(row => row.level === level && row.status === 'PENDING')
    if (!pending?.idForecastApproval) break

    await approveForecastLevel(session, pending.idForecastApproval, userId, 'E2E auto-approve')
  }
}

async function runScenario(
  session: Session,
  userId: number,
  scenario: Scenario
): Promise<ScenarioResult> {
  const steps: StepLog[] = []
  const log = (step: string, ok: boolean, detail?: string) => steps.push({ step, ok, detail })

  try {
    const repBefore = await prisma.replacement.findUnique({ where: { idRep: scenario.idRep } })
    if (!repBefore || repBefore.woStatus !== 'OPEN') {
      throw new Error(`Replacement ${scenario.idRep} not OPEN`)
    }

    const beforeCompHour = Number(repBefore.compHour ?? 0)
    log('pick replacement', true, `id_rep=${scenario.idRep}, compHour=${beforeCompHour}`)

    const forecast = await createForecast(
      session,
      {
        fleetUnitId: repBefore.fleetUnitId,
        idMod: repBefore.idMod,
        idRep: scenario.idRep,
        planPeriod: new Date('2026-09-01'),
        isWarranty: scenario.isWarranty,
        pcrSupplyCategory: scenario.pcrSupplyCategory ?? null,
        repairSite: scenario.repairSite ?? null,
        repairLifeMode: scenario.repairLifeMode ?? null
      },
      userId
    )

    log('create forecast', true, `id_forecast=${forecast.idForecast}`)

    await submitForecastBa(session, forecast.idForecast, userId)
    log('submit BA', true)

    await approveAllPending(session, forecast.idForecast, userId)
    const afterApprove = await getForecastById(session, forecast.idForecast)
    log('approve all', afterApprove?.baPcrStatus === 'APPROVED', `status=${afterApprove?.baPcrStatus}`)

    await convertForecastToReplacement(session, forecast.idForecast)
    log('convert to replacement', true)

    const idRep = forecast.idRep ?? scenario.idRep

    if (!scenario.isWarranty) {
      await prisma.replacement.update({
        where: { idRep },
        data: {
          mrNo: `MR-E2E-${idRep}`,
          prNo: `PR-E2E-${idRep}`,
          poNo: `PO-E2E-${idRep}`,
          returnOldcoreDate: new Date('2026-09-09'),
          spbBaReturnOldcore: `SPB-E2E-${idRep}`
        }
      })
      log('dummy procurement', true)
    }

    await uploadReplacementReport(session, idRep, dummyPdfFile())
    log('upload installation report', true)

    const latestHm = await prisma.hm.findFirst({
      where: { fleetUnitId: repBefore.fleetUnitId, deletedAt: null },
      orderBy: { dateHm: 'desc' }
    })
    const closingHm = Number(latestHm?.hmUnit ?? repBefore.hmRep ?? 0)

    const closed = await closeReplacement(session, idRep, {
      closingHm,
      woEndDate: new Date('2026-09-10')
    })

    if (!closed) throw new Error('closeReplacement returned null')
    log('close replacement', true, `closed id_rep=${closed.idRep}`)

    const chain = await prisma.replacement.findMany({
      where: { fleetUnitId: repBefore.fleetUnitId, idMod: repBefore.idMod, deletedAt: null },
      orderBy: { idRep: 'asc' }
    })
    const spawned = findSpawnedOpenAfterClose(closed, chain)

    const ctx = {
      isWarranty: scenario.isWarranty,
      pcrSupplyCategory: scenario.pcrSupplyCategory ?? null,
      repairLifeMode: scenario.repairLifeMode ?? null
    }

    const expectCarry = carriesCompHourOnSpawn(ctx)
    const expectReset = resetClosedLifeOnClose(ctx)
    const spawnOk = expectCarry
      ? Number(spawned?.compHour ?? -1) === beforeCompHour
      : Number(spawned?.compHour ?? -1) === 0
    const closedLifeOk = expectReset
      ? Number(closed.lifePercent) === 0 && Number(closed.compLife) === 0
      : Number(closed.lifePercent) > 0 || Number(closed.compLife) > 0

    log(
      'verify closed life',
      closedLifeOk,
      `compLife=${closed.compLife}, lifePercent=${closed.lifePercent}, expectReset=${expectReset}`
    )
    log(
      'verify spawn compHour',
      spawnOk,
      `spawn id=${spawned?.idRep}, compHour=${spawned?.compHour}, expectCarry=${expectCarry}`
    )

    return {
      scenario,
      idForecast: forecast.idForecast,
      closedIdRep: closed.idRep,
      spawnedIdRep: spawned?.idRep,
      beforeCompHour,
      closedCompLife: closed.compLife != null ? Number(closed.compLife) : null,
      closedLifePercent: closed.lifePercent != null ? Number(closed.lifePercent) : null,
      spawnCompHour: spawned?.compHour != null ? Number(spawned.compHour) : null,
      steps
    }
  } catch (error) {
    log('error', false, error instanceof Error ? error.message : String(error))

    return {
      scenario,
      steps,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

function renderMarkdown(
  candidates: Awaited<ReturnType<typeof findCandidates>>,
  results: ScenarioResult[]
): string {
  const lines: string[] = [
    '# E2E — Repair Life Mode on Close Replacement',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Objective',
    '',
    'Verify `closeReplacement()` respects forecast `repairLifeMode`:',
    '- **CONTINUE_LIFE / RETURN:** closed row keeps calculated life; spawned OPEN carries `compHour`.',
    '- **BACK_TO_ZERO:** closed row `compLife`/`lifePercent` = 0; spawned OPEN `compHour` = 0.',
    '- **Warranty:** spawn `compHour` = 0; closed row normal calculated life.',
    '',
    '## Code changes',
    '',
    '- `lib/replacement/close-life-policy.ts` — policy helpers',
    '- `lib/replacement/service.ts` — `closeReplacement()` wired to forecast context',
    '',
    '## Candidate selection',
    ''
  ]

  if (candidates.warranty) {
    lines.push(
      `| Warranty candidate | id_rep=${candidates.warranty.idRep} | lifePercent=${candidates.warranty.lifePercent}% | compHour=${candidates.warranty.compHour} |`
    )
  } else {
    lines.push('- **No warranty-eligible OPEN replacement found** (lifePercent < 100%)')
  }

  lines.push('', '| Repair candidates |', '| --- |')
  for (const row of candidates.repairRows.slice(0, 2)) {
    lines.push(`| id_rep=${row.idRep} | ${row.unitNo} — ${row.compDesc} | compHour=${row.compHour} |`)
  }

  lines.push('', '## Scenarios executed', '')

  for (const result of results) {
    const s = result.scenario
    lines.push(`### ${s.label}`)
    lines.push('')
    lines.push(`- **id_rep:** ${s.idRep}`)
    lines.push(`- **Forecast:** ${result.idForecast ?? '—'}`)
    lines.push(`- **isWarranty:** ${s.isWarranty}`)
    if (s.pcrSupplyCategory) lines.push(`- **pcrSupplyCategory:** ${s.pcrSupplyCategory}`)
    if (s.repairLifeMode) lines.push(`- **repairLifeMode:** ${s.repairLifeMode}`)
    lines.push('')
    lines.push('| Step | OK | Detail |')
    lines.push('| --- | --- | --- |')
    for (const step of result.steps) {
      lines.push(`| ${step.step} | ${step.ok ? '✅' : '❌'} | ${step.detail ?? ''} |`)
    }
    lines.push('')
    lines.push('**After close:**')
    lines.push('')
    lines.push(`| Metric | Value |`)
    lines.push(`| before compHour | ${result.beforeCompHour ?? '—'} |`)
    lines.push(`| closed compLife | ${result.closedCompLife ?? '—'} |`)
    lines.push(`| closed lifePercent | ${result.closedLifePercent ?? '—'} |`)
    lines.push(`| spawned compHour | ${result.spawnCompHour ?? '—'} |`)
    lines.push(`| spawned id_rep | ${result.spawnedIdRep ?? '—'} |`)
    if (result.error) lines.push('', `> **Error:** ${result.error}`)
    lines.push('')
  }

  const allOk = results.every(r => !r.error && r.steps.every(s => s.ok))
  lines.push('## Summary', '', allOk ? '**All scenarios passed.**' : '**Some scenarios failed — see details above.**')

  return lines.join('\n')
}

async function main() {
  const { session, userId } = await buildAdminSession()
  const candidates = await findCandidates()

  if (!candidates.warranty) {
    console.warn('No warranty candidate — skipping warranty scenario')
  }
  if (candidates.repairRows.length < 2) {
    throw new Error('Need at least 2 repair candidates with compHour > 500 and no linked forecast')
  }

  const scenarios: Scenario[] = []

  if (candidates.warranty) {
    scenarios.push({
      label: 'Warranty',
      idRep: candidates.warranty.idRep,
      isWarranty: true
    })
  }

  scenarios.push(
    {
      label: 'Repair CONTINUE_LIFE',
      idRep: candidates.repairRows[0].idRep,
      isWarranty: false,
      pcrSupplyCategory: 'REPAIR',
      repairSite: 'ON_SITE',
      repairLifeMode: 'CONTINUE_LIFE'
    },
    {
      label: 'Repair BACK_TO_ZERO',
      idRep: candidates.repairRows[1].idRep,
      isWarranty: false,
      pcrSupplyCategory: 'REPAIR',
      repairSite: 'ON_SITE',
      repairLifeMode: 'BACK_TO_ZERO'
    }
  )

  const results: ScenarioResult[] = []
  for (const scenario of scenarios) {
    console.log(`\n--- Running: ${scenario.label} (id_rep=${scenario.idRep}) ---`)
    const result = await runScenario(session, userId, scenario)
    results.push(result)
    console.log(result.error ? `FAILED: ${result.error}` : 'OK')
  }

  const md = renderMarkdown(candidates, results)
  const outPath = path.join(process.cwd(), 'docs', 'e2e-repair-life-mode-close.md')
  fs.writeFileSync(outPath, md, 'utf8')
  console.log(`\nWrote ${outPath}`)

  const failed = results.filter(r => r.error || r.steps.some(s => !s.ok))
  if (failed.length) process.exit(1)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
