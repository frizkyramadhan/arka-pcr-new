/**
 * E2E: PCR supply grill (location, lifetime, return-to, cannibal, oldcore) — real local DB.
 * Usage: npx tsx --env-file=.env.local scripts/dev/e2e-pcr-supply-grill-flow.ts
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
import { getCurrentPendingPcrLevel } from '@/lib/forecasts/approval-workflow'
import { forecastApprovalContextFrom } from '@/lib/approval/registry'
import { prisma } from '@/lib/prisma'
import { getUserProjectCodes } from '@/lib/rbac/user-projects'
import { getUserRolesAndPermissions } from '@/lib/rbac/defaults'
import type { ForecastCreateInput } from '@/lib/validations/forecast'

type GrillScenario = {
  label: string
  create: ForecastCreateInput
  /** Close WO on this id_rep when set; else use forecast.idRep after convert */
  closeIdRep?: number
  oldcoreStatus?: 'FIRST_LIFE_80' | 'SECOND_LIFE_60' | 'THIRD_LIFE_40'
  predictionOldcore?: 'FULL_CORE' | 'PARTIAL_CORE' | 'BER'
  skipConvert?: boolean
}

type StepLog = { step: string; ok: boolean; detail?: string }

type ScenarioResult = {
  label: string
  pick?: Record<string, string | number | null>
  idForecast?: number
  idRepClosed?: number
  storedForecast?: Record<string, unknown> | null
  storedReplacement?: Record<string, unknown> | null
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

async function linkedIdReps(): Promise<Set<number>> {
  const rows = await prisma.pcrForecast.findMany({
    where: { deletedAt: null, idRep: { not: null } },
    select: { idRep: true }
  })

  return new Set(rows.map(r => r.idRep!).filter(Boolean))
}

async function findFreeOpenRep(minCompHour = 500, exclude = new Set<number>()) {
  const linked = await linkedIdReps()
  const rows = await prisma.replacement.findMany({
    where: {
      woStatus: 'OPEN',
      deletedAt: null,
      compHour: { gte: minCompHour }
    },
    include: { commod: { include: { comp: true } } },
    orderBy: { idRep: 'desc' },
    take: 120
  })

  for (const row of rows) {
    if (linked.has(row.idRep) || exclude.has(row.idRep)) continue

    return row
  }

  return null
}

async function findWarrantyRep(exclude = new Set<number>()) {
  const linked = await linkedIdReps()
  const rows = await prisma.replacement.findMany({
    where: { woStatus: 'OPEN', deletedAt: null },
    include: { commod: { include: { comp: true } } },
    orderBy: { compHour: 'desc' },
    take: 100
  })

  for (const row of rows) {
    if (linked.has(row.idRep) || exclude.has(row.idRep)) continue
    const snapshot = await buildForecastSnapshot(row.fleetUnitId, row.idMod)
    if (isUnderPolicy(snapshot.lifePercent)) return { row, snapshot }
  }

  return null
}

type CannibalPick = {
  noBa: string
  statusBa: string
  donorFleetUnitId: number
  donorUnitNo: string
  installFleetUnitId: number
  installUnitNo: string
  idMod: number
  compDesc: string
}

/** Cannibal OPEN BA where kanibal comp_desc matches a commod on donor + install model. */
async function findCannibalOtherUnitPick(): Promise<CannibalPick | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      no_ba: string
      status_ba: string
      remove_u: number
      remove_no: string
      install_u: number
      install_no: string
      comp_desc: string
      id_mod: number
    }>
  >`
    SELECT b.no_ba, b.status_ba, kr.id_unit AS remove_u, ur.unit_no AS remove_no,
           ki.id_unit AS install_u, ui.unit_no AS install_no, kr.comp_desc, m.id_mod
    FROM ba b
    JOIN kanibal kr ON kr.no_ba = b.no_ba AND kr.type = 'REMOVE' AND kr.deleted_at IS NULL
    JOIN kanibal ki ON ki.no_ba = b.no_ba AND ki.type = 'INSTALL' AND ki.deleted_at IS NULL
      AND LOWER(TRIM(ki.comp_desc)) = LOWER(TRIM(kr.comp_desc))
    JOIN fleet_equipment_cache ur ON ur.fleet_equipment_id = kr.id_unit
    JOIN fleet_equipment_cache ui ON ui.fleet_equipment_id = ki.id_unit
    JOIN commod m ON m.id_model = ur.fleet_model_id
    JOIN comp c ON c.id_comp = m.id_comp AND LOWER(TRIM(c.comp_desc)) = LOWER(TRIM(kr.comp_desc))
    WHERE b.deleted_at IS NULL
      AND b.status_ba NOT IN ('EXPIRED', 'CANCELLED', 'CANCEL', 'REJECTED')
      AND EXISTS (
        SELECT 1 FROM commod m2 WHERE m2.id_model = ui.fleet_model_id AND m2.id_comp = c.id_comp
      )
    ORDER BY b.no_ba DESC
    LIMIT 30
  `

  for (const row of rows) {
    if (row.status_ba === 'DRAFT' || row.status_ba === 'CLOSE') continue
    const openFc = await prisma.pcrForecast.findFirst({
      where: {
        fleetUnitId: row.remove_u,
        idMod: row.id_mod,
        deletedAt: null,
        forecastStatus: 'OPEN'
      }
    })
    if (openFc) continue

    return {
      noBa: row.no_ba,
      statusBa: row.status_ba,
      donorFleetUnitId: row.remove_u,
      donorUnitNo: row.remove_no,
      installFleetUnitId: row.install_u,
      installUnitNo: row.install_no,
      idMod: row.id_mod,
      compDesc: row.comp_desc
    }
  }

  return null
}

async function buildScenarios(): Promise<{ scenarios: GrillScenario[]; picks: Record<string, unknown> }> {
  const usedReps = new Set<number>()
  const picks: Record<string, unknown> = {}

  const warranty = await findWarrantyRep(usedReps)
  const repPta = await findFreeOpenRep(500, usedReps)
  if (repPta) usedReps.add(repPta.idRep)
  const repNew = await findFreeOpenRep(500, usedReps)
  if (repNew) usedReps.add(repNew.idRep)
  const repRepairCont = await findFreeOpenRep(500, usedReps)
  if (repRepairCont) usedReps.add(repRepairCont.idRep)
  const repRepairZero = await findFreeOpenRep(500, usedReps)
  if (repRepairZero) usedReps.add(repRepairZero.idRep)
  const repRepairOem = await findFreeOpenRep(500, usedReps)
  if (repRepairOem) usedReps.add(repRepairOem.idRep)
  const cannibal = await findCannibalOtherUnitPick()

  const scenarios: GrillScenario[] = []
  const planBase = '2026-10-01'

  if (warranty) {
    picks.warranty = {
      id_rep: warranty.row.idRep,
      unit: warranty.row.unitNo,
      comp: warranty.row.commod?.comp?.compDesc,
      lifePercent: warranty.snapshot.lifePercent
    }
    scenarios.push({
      label: 'Warranty · Original Unit',
      create: {
        fleetUnitId: warranty.row.fleetUnitId,
        idMod: warranty.row.idMod,
        idRep: warranty.row.idRep,
        planPeriod: new Date(planBase),
        isWarranty: true
      }
    })
  }

  if (repPta) {
    picks.ptaAps = {
      id_rep: repPta.idRep,
      unit: repPta.unitNo,
      comp: repPta.commod?.comp?.compDesc
    }
    scenarios.push({
      label: 'PTA Reman · Out Site · APS · Ex Repair · Continue Life · Original',
      create: {
        fleetUnitId: repPta.fleetUnitId,
        idMod: repPta.idMod,
        idRep: repPta.idRep,
        planPeriod: new Date(planBase),
        isWarranty: false,
        pcrSupplyCategory: 'PTA_REMAN',
        repairSite: 'OUT_SITE',
        repairVendorKind: 'APS',
        pcrComponentGrade: 'EX_REPAIR',
        repairLifeMode: 'CONTINUE_LIFE',
        pcrReturnTo: 'ORIGINAL_UNIT'
      },
      oldcoreStatus: 'FIRST_LIFE_80',
      predictionOldcore: 'FULL_CORE'
    })
  }

  if (repNew) {
    picks.newOnSite = {
      id_rep: repNew.idRep,
      unit: repNew.unitNo,
      comp: repNew.commod?.comp?.compDesc
    }
    scenarios.push({
      label: 'New Component · On Site · Back to Zero · Original',
      create: {
        fleetUnitId: repNew.fleetUnitId,
        idMod: repNew.idMod,
        idRep: repNew.idRep,
        planPeriod: new Date(planBase),
        isWarranty: false,
        pcrSupplyCategory: 'NEW_COMPONENT',
        repairSite: 'ON_SITE',
        repairLifeMode: 'BACK_TO_ZERO',
        pcrReturnTo: 'ORIGINAL_UNIT'
      },
      oldcoreStatus: 'SECOND_LIFE_60',
      predictionOldcore: 'PARTIAL_CORE'
    })
  }

  if (repRepairCont) {
    picks.repairContinue = {
      id_rep: repRepairCont.idRep,
      unit: repRepairCont.unitNo,
      comp: repRepairCont.commod?.comp?.compDesc
    }
    scenarios.push({
      label: 'Repair · On Site · Continue Life · Original',
      create: {
        fleetUnitId: repRepairCont.fleetUnitId,
        idMod: repRepairCont.idMod,
        idRep: repRepairCont.idRep,
        planPeriod: new Date(planBase),
        isWarranty: false,
        pcrSupplyCategory: 'REPAIR',
        repairSite: 'ON_SITE',
        repairLifeMode: 'CONTINUE_LIFE',
        pcrReturnTo: 'ORIGINAL_UNIT'
      },
      oldcoreStatus: 'THIRD_LIFE_40',
      predictionOldcore: 'BER'
    })
  }

  if (repRepairZero) {
    picks.repairBackZero = {
      id_rep: repRepairZero.idRep,
      unit: repRepairZero.unitNo,
      comp: repRepairZero.commod?.comp?.compDesc
    }
    scenarios.push({
      label: 'Repair · On Site · Back to Zero · Original',
      create: {
        fleetUnitId: repRepairZero.fleetUnitId,
        idMod: repRepairZero.idMod,
        idRep: repRepairZero.idRep,
        planPeriod: new Date(planBase),
        isWarranty: false,
        pcrSupplyCategory: 'REPAIR',
        repairSite: 'ON_SITE',
        repairLifeMode: 'BACK_TO_ZERO',
        pcrReturnTo: 'ORIGINAL_UNIT'
      },
      oldcoreStatus: 'FIRST_LIFE_80',
      predictionOldcore: 'FULL_CORE'
    })
  }

  if (repRepairOem) {
    picks.repairDealer = {
      id_rep: repRepairOem.idRep,
      unit: repRepairOem.unitNo,
      comp: repRepairOem.commod?.comp?.compDesc
    }
    scenarios.push({
      label: 'Repair · Out Site · Dealer · Continue Life · Original',
      create: {
        fleetUnitId: repRepairOem.fleetUnitId,
        idMod: repRepairOem.idMod,
        idRep: repRepairOem.idRep,
        planPeriod: new Date(planBase),
        isWarranty: false,
        pcrSupplyCategory: 'REPAIR',
        repairSite: 'OUT_SITE',
        repairVendorKind: 'DEALER',
        repairDealerName: 'E2E Dealer Workshop',
        repairLifeMode: 'CONTINUE_LIFE',
        pcrReturnTo: 'ORIGINAL_UNIT'
      },
      oldcoreStatus: 'SECOND_LIFE_60',
      predictionOldcore: 'PARTIAL_CORE'
    })
  }

  if (cannibal) {
    picks.cannibalOtherUnit = cannibal
    scenarios.push({
      label: 'Repair · On Site · Continue Life · Other Unit + Cannibal BA',
      create: {
        fleetUnitId: cannibal.donorFleetUnitId,
        idMod: cannibal.idMod,
        planPeriod: new Date(planBase),
        isWarranty: false,
        pcrSupplyCategory: 'REPAIR',
        repairSite: 'ON_SITE',
        repairLifeMode: 'CONTINUE_LIFE',
        pcrReturnTo: 'OTHER_UNIT',
        returnOtherFleetUnitId: cannibal.installFleetUnitId,
        cannibalNoBa: cannibal.noBa
      },
      oldcoreStatus: 'FIRST_LIFE_80',
      predictionOldcore: 'FULL_CORE'
    })
  }

  return { scenarios, picks }
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

    await approveForecastLevel(session, pending.idForecastApproval, userId, 'E2E grill auto-approve')
  }
}

async function runScenario(
  session: Session,
  userId: number,
  scenario: GrillScenario
): Promise<ScenarioResult> {
  const steps: StepLog[] = []
  const log = (step: string, ok: boolean, detail?: string) => steps.push({ step, ok, detail })

  try {
    const created = await createForecast(session, scenario.create, userId)
    log('create forecast', true, `id_forecast=${created.idForecast}`)

    await submitForecastBa(session, created.idForecast, userId)
    log('submit BA PCR', true)

    await approveAllPending(session, created.idForecast, userId)
    const afterApprove = await getForecastById(session, created.idForecast)
    log('approve chain', afterApprove?.baPcrStatus === 'APPROVED', `baPcrStatus=${afterApprove?.baPcrStatus}`)

    let idRep = scenario.closeIdRep ?? created.idRep ?? null

    if (!scenario.skipConvert) {
      await convertForecastToReplacement(session, created.idForecast)
      const refreshed = await getForecastById(session, created.idForecast)
      idRep = refreshed?.idRep ?? idRep
      log(
        'convert to WO',
        Boolean(idRep),
        `id_rep=${idRep}, returnTo=${refreshed?.pcrReturnTo}, cannibal=${refreshed?.cannibalNoBa ?? '—'}`
      )
    }

    if (!idRep) throw new Error('No id_rep to close')

    const repRow = await prisma.replacement.findUnique({ where: { idRep } })
    log(
      'target WO unit',
      Boolean(repRow),
      repRow ? `${repRow.unitNo} (fleetUnitId=${repRow.fleetUnitId})` : 'missing'
    )

    if (!scenario.create.isWarranty) {
      await prisma.replacement.update({
        where: { idRep },
        data: {
          mrNo: `MR-E2E-${idRep}`,
          prNo: `PR-E2E-${idRep}`,
          poNo: `PO-E2E-${idRep}`,
          returnOldcoreDate: new Date('2026-09-12'),
          spbBaReturnOldcore: `SPB-E2E-${idRep}`
        }
      })
      log('procurement fields', true)
    }

    await uploadReplacementReport(session, idRep, dummyPdfFile())
    log('installation report', true)

    const fleetUnitId = repRow!.fleetUnitId
    const latestHm = await prisma.hm.findFirst({
      where: { fleetUnitId, deletedAt: null },
      orderBy: { dateHm: 'desc' }
    })
    const closingHm = Number(latestHm?.hmUnit ?? repRow!.hmRep ?? 0)

    await closeReplacement(session, idRep, {
      closingHm,
      woEndDate: new Date('2026-09-14'),
      oldcoreStatus: scenario.oldcoreStatus,
      predictionOldcore: scenario.predictionOldcore
    })
    log('close WO', true, `oldcore=${scenario.oldcoreStatus}, prediction=${scenario.predictionOldcore}`)

    const storedForecast = await prisma.pcrForecast.findUnique({
      where: { idForecast: created.idForecast },
      select: {
        idForecast: true,
        idRep: true,
        unitNo: true,
        compDesc: true,
        pcrSupplyCategory: true,
        repairSite: true,
        repairVendorKind: true,
        repairDealerName: true,
        repairLifeMode: true,
        pcrComponentGrade: true,
        pcrReturnTo: true,
        returnOtherFleetUnitId: true,
        cannibalNoBa: true,
        convertedAt: true,
        isWarranty: true
      }
    })

    const storedReplacement = await prisma.replacement.findUnique({
      where: { idRep },
      select: {
        idRep: true,
        unitNo: true,
        woStatus: true,
        oldcoreStatus: true,
        predictionOldcore: true,
        compLife: true,
        lifePercent: true,
        compHour: true,
        poNo: true
      }
    })

    return {
      label: scenario.label,
      idForecast: created.idForecast,
      idRepClosed: idRep,
      storedForecast,
      storedReplacement,
      steps
    }
  } catch (error) {
    log('error', false, error instanceof Error ? error.message : String(error))

    return {
      label: scenario.label,
      steps,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

function renderMarkdown(picks: Record<string, unknown>, results: ScenarioResult[]): string {
  const lines: string[] = [
    '# E2E — PCR Supply Grill (Forecast → BA → Convert → Close)',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Build',
    '',
    '`npm run build` — **success** (see terminal run on same date).',
    '',
    '## Data picks (local DB `arka_pcr_new`)',
    '',
    '```json',
    JSON.stringify(picks, null, 2),
    '```',
    '',
    '## Scenarios',
    ''
  ]

  for (const r of results) {
    lines.push(`### ${r.label}`)
    lines.push('')
    if (r.error) lines.push(`> **Failed:** ${r.error}`, '')
    lines.push('| Step | OK | Detail |')
    lines.push('| --- | --- | --- |')
    for (const s of r.steps) {
      lines.push(`| ${s.step} | ${s.ok ? '✅' : '❌'} | ${s.detail ?? ''} |`)
    }
    lines.push('')
    if (r.storedForecast) {
      lines.push('**Forecast row (after run):**')
      lines.push('')
      lines.push('```json')
      lines.push(JSON.stringify(r.storedForecast, null, 2))
      lines.push('```')
      lines.push('')
    }
    if (r.storedReplacement) {
      lines.push('**Replacement closed:**')
      lines.push('')
      lines.push('```json')
      lines.push(JSON.stringify(r.storedReplacement, null, 2))
      lines.push('```')
      lines.push('')
    }
  }

  const ok = results.every(r => !r.error && r.steps.every(s => s.ok))
  lines.push('## Summary', '', ok ? '**All grill scenarios passed.**' : '**Some scenarios failed.**')

  return lines.join('\n')
}

async function main() {
  const { session, userId } = await buildAdminSession()
  const { scenarios, picks } = await buildScenarios()

  if (scenarios.length === 0) throw new Error('No scenarios could be built from local DB')

  console.log('Picks:', JSON.stringify(picks, null, 2))

  const results: ScenarioResult[] = []
  for (const scenario of scenarios) {
    console.log(`\n=== ${scenario.label} ===`)
    const result = await runScenario(session, userId, scenario)
    results.push(result)
    console.log(result.error ?? 'OK')
  }

  const md = renderMarkdown(picks, results)
  const outPath = path.join(process.cwd(), 'docs', 'e2e-pcr-supply-grill-flow.md')
  fs.writeFileSync(outPath, md, 'utf8')
  console.log(`\nWrote ${outPath}`)

  const failed = results.filter(r => r.error || r.steps.some(s => !s.ok))
  if (failed.length) process.exit(1)
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
