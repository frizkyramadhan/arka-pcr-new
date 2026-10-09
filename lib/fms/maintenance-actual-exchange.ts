/**
 * Export/import Excel Actual + Failure.
 * Export mengikuti filter list (dan scope site di list API).
 * Import menambah actual atau temuan yang belum ada. Baris yang sudah ada tidak diubah dan tidak dihapus.
 */
import type { Session } from 'next-auth'

import { createMaintenanceActual, listMaintenanceActuals, type ListMaintenanceActualsQuery } from '@/lib/fms/maintenance-actuals'
import {
  blankActualSheetRow,
  parseSheetTime,
  rowHasFinding,
  sheetCell,
  sheetGroupKey,
  type ActualSheetRow
} from '@/lib/fms/maintenance-actual-sheet'
import { listFailures, syncActualFailures, type FailureListQuery } from '@/lib/fms/maintenance-failures'
import { parseCreatedById, parsePlanDateInput } from '@/lib/fms/maintenance-plans'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { canAccessProject } from '@/lib/utils/project-scope'

type SheetError = { row: number; message: string }

type ParsedSheetLine = {
  row: number
  project: string
  unitNo: string
  program: string
  planDateIso: string
  registerNo: string
  maintenanceDateIso: string
  time: string | null
  hourMeter: number | null
  mechanics: string
  remarks: string
  qcStatus: string
  actualPic: string
  severity: string
  finding: string
  componentCode: string
  subComponentCode: string
  damageCode: string
  findingDateIso: string
  closedOnIso: string
  failurePic: string
  hasFinding: boolean
}

const picLabel = (pic: { username: string; fullName: string | null } | null | undefined) =>
  pic ? pic.username || pic.fullName || '' : ''

function textCell(row: Record<string, unknown>, ...keys: string[]): string {
  return String(sheetCell(row, ...keys)).trim()
}

function parseLine(raw: Record<string, unknown>, row: number): { ok: true; line: ParsedSheetLine } | { ok: false; error: SheetError } {
  const planDate = parsePlanDateInput(sheetCell(raw, 'Plan Date', 'planDate', 'plan_date'))
  const maintenanceDate = parsePlanDateInput(sheetCell(raw, 'Maintenance Date', 'maintenanceDate', 'maintenance_date'))
  const findingDate = parsePlanDateInput(sheetCell(raw, 'Finding Date', 'occurredAt', 'occurred_at'))
  const closedOn = parsePlanDateInput(sheetCell(raw, 'Closed On', 'closureDate', 'closure_date'))
  const hourRaw = sheetCell(raw, 'Hour Meter', 'hourMeter', 'hour_meter')

  const hourMeter =
    hourRaw === '' ? null : Number.isFinite(Number(hourRaw)) ? Math.trunc(Number(hourRaw)) : Number.NaN

  if (Number.isNaN(hourMeter)) {
    return { ok: false, error: { row, message: 'Hour Meter must be a number' } }
  }
  if (sheetCell(raw, 'Plan Date', 'planDate', 'plan_date') !== '' && !planDate) {
    return { ok: false, error: { row, message: 'Plan Date must be YYYY-MM-DD' } }
  }
  if (sheetCell(raw, 'Maintenance Date', 'maintenanceDate') !== '' && !maintenanceDate) {
    return { ok: false, error: { row, message: 'Maintenance Date must be YYYY-MM-DD' } }
  }
  if (sheetCell(raw, 'Finding Date', 'occurredAt') !== '' && !findingDate) {
    return { ok: false, error: { row, message: 'Finding Date must be YYYY-MM-DD' } }
  }
  if (sheetCell(raw, 'Closed On', 'closureDate') !== '' && !closedOn) {
    return { ok: false, error: { row, message: 'Closed On must be YYYY-MM-DD' } }
  }

  const line: ParsedSheetLine = {
    row,
    project: textCell(raw, 'Project', 'projectId'),
    unitNo: textCell(raw, 'Unit', 'unitNo', 'unit_no'),
    program: textCell(raw, 'Maintenance Type', 'Program', 'program'),
    planDateIso: planDate?.iso ?? '',
    registerNo: textCell(raw, 'Register No', 'registerNo', 'register_no'),
    maintenanceDateIso: maintenanceDate?.iso ?? '',
    time: parseSheetTime(sheetCell(raw, 'Time', 'maintenanceTime')),
    hourMeter,
    mechanics: textCell(raw, 'Mechanics', 'mechanics'),
    remarks: textCell(raw, 'Remarks', 'remarks'),
    qcStatus: textCell(raw, 'QC Status', 'qcStatus'),
    actualPic: textCell(raw, 'Actual PIC', 'pic'),
    severity: textCell(raw, 'Severity', 'severity'),
    finding: textCell(raw, 'Finding', 'description'),
    componentCode: textCell(raw, 'Component', 'componentCode'),
    subComponentCode: textCell(raw, 'Sub Component', 'subComponentCode'),
    damageCode: textCell(raw, 'Damage', 'damageCode'),
    findingDateIso: findingDate?.iso ?? '',
    closedOnIso: closedOn?.iso ?? '',
    failurePic: textCell(raw, 'Failure PIC', 'failurePic'),
    hasFinding: false
  }
  line.hasFinding = rowHasFinding({
    severity: line.severity,
    finding: line.finding,
    componentCode: line.componentCode,
    subComponentCode: line.subComponentCode,
    damageCode: line.damageCode,
    findingDate: line.findingDateIso,
    closedOn: line.closedOnIso,
    failurePic: line.failurePic
  })

  return { ok: true, line }
}

function sheetRow(input: Partial<ActualSheetRow>): ActualSheetRow {
  return { ...blankActualSheetRow(), ...input }
}

type ActualExportBits = {
  id: string
  registerNo: string
  unitNo: string
  projectId: string
  typeName: string
  planDate: string
  maintenanceDate: string
  maintenanceTime: string
  hourMeter: number
  mechanics: string
  remarks: string
  qcStatus: string
  pic: string
}

function actualColumns(actual: ActualExportBits): Partial<ActualSheetRow> {
  return {
    Project: actual.projectId,
    Unit: actual.unitNo,
    'Maintenance Type': actual.typeName,
    'Plan Date': actual.planDate,
    'Register No': actual.registerNo,
    'Maintenance Date': actual.maintenanceDate,
    Time: actual.maintenanceTime,
    'Hour Meter': actual.hourMeter,
    Mechanics: actual.mechanics,
    Remarks: actual.remarks,
    'QC Status': actual.qcStatus,
    'Actual PIC': actual.pic
  }
}

/** Baris Excel untuk filter list actual. Actual tanpa temuan tetap ikut. */
export async function actualSheetRowsForActuals(
  session: Session,
  query: ListMaintenanceActualsQuery
): Promise<ActualSheetRow[]> {
  const listed = await listMaintenanceActuals(session, query)
  const ids = listed.maintenanceActuals.map(row => row.id)
  if (!ids.length) return []

  const [actuals, failures] = await Promise.all([
    prisma.maintenanceActual.findMany({
      where: { id: { in: ids } },
      include: {
        pic: { select: { username: true, fullName: true } },
        fleetUnit: { select: { unitNo: true } },
        maintenancePlan: {
          select: { projectId: true, maintenanceType: { select: { name: true } } }
        },
        maintenancePlanDetail: { select: { planDate: true } }
      }
    }),
    prisma.maintenanceFailure.findMany({
      where: { maintenanceActualId: { in: ids } },
      include: { pic: { select: { username: true, fullName: true } } },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }]
    })
  ])

  const byId = new Map(actuals.map(row => [row.id, row]))
  const failuresByActual = new Map<string, typeof failures>()
  for (const failure of failures) {
    if (!failure.maintenanceActualId) continue
    const list = failuresByActual.get(failure.maintenanceActualId) ?? []
    list.push(failure)
    failuresByActual.set(failure.maintenanceActualId, list)
  }

  const rows: ActualSheetRow[] = []
  for (const item of listed.maintenanceActuals) {
    const actual = byId.get(item.id)
    if (!actual) continue

    const bits: ActualExportBits = {
      id: actual.id,
      registerNo: actual.registerNo,
      unitNo: actual.fleetUnit?.unitNo ?? item.unitNo ?? '',
      projectId: actual.maintenancePlan?.projectId ?? item.planProjectId ?? '',
      typeName: actual.maintenancePlan?.maintenanceType?.name ?? item.planTypeName ?? '',
      planDate: toIsoDateOnly(actual.maintenancePlanDetail?.planDate) ?? item.planDate ?? '',
      maintenanceDate: toIsoDateOnly(actual.maintenanceDate) ?? item.maintenanceDate ?? '',
      maintenanceTime: actual.maintenanceTime ?? '',
      hourMeter: actual.hourMeter,
      mechanics: actual.mechanics ?? '',
      remarks: actual.remarks ?? '',
      qcStatus: actual.qcStatus ?? '',
      pic: picLabel(actual.pic)
    }
    const findings = failuresByActual.get(actual.id) ?? []
    if (!findings.length) {
      rows.push(sheetRow(actualColumns(bits)))
      continue
    }
    for (const failure of findings) {
      rows.push(
        sheetRow({
          ...actualColumns(bits),
          Severity: failure.severity,
          Finding: failure.description,
          Component: failure.componentCode ?? '',
          'Component Name': failure.componentName ?? '',
          'Sub Component': failure.subComponentCode ?? '',
          'Sub Component Name': failure.subComponentName ?? '',
          Damage: failure.damageCode ?? '',
          'Damage Name': failure.damageName ?? '',
          'Finding Date': toIsoDateOnly(failure.occurredAt) ?? '',
          'Closed On': toIsoDateOnly(failure.closureDate) ?? '',
          'Failure PIC': picLabel(failure.pic)
        })
      )
    }
  }

  return rows
}

/** Baris Excel untuk filter list failure. Satu baris = satu temuan yang sedang tampil. */
export async function actualSheetRowsForFailures(session: Session, query: FailureListQuery): Promise<ActualSheetRow[]> {
  const listed = await listFailures(session, query)
  const actualIds = [...new Set(listed.failures.map(row => row.maintenanceActualId).filter((id): id is string => Boolean(id)))]

  const actuals = actualIds.length
    ? await prisma.maintenanceActual.findMany({
        where: { id: { in: actualIds } },
        include: {
          pic: { select: { username: true, fullName: true } },
          fleetUnit: { select: { unitNo: true } },
          maintenancePlan: {
            select: { projectId: true, maintenanceType: { select: { name: true } } }
          },
          maintenancePlanDetail: { select: { planDate: true } }
        }
      })
    : []
  const byId = new Map(actuals.map(row => [row.id, row]))

  return listed.failures.map(failure => {
    const actual = failure.maintenanceActualId ? byId.get(failure.maintenanceActualId) : undefined

    return sheetRow({
      Project: actual?.maintenancePlan?.projectId ?? failure.projectId,
      Unit: actual?.fleetUnit?.unitNo ?? failure.unitNo ?? '',
      'Maintenance Type': actual?.maintenancePlan?.maintenanceType?.name ?? '',
      'Plan Date': toIsoDateOnly(actual?.maintenancePlanDetail?.planDate) ?? '',
      'Register No': actual?.registerNo ?? failure.registerNo ?? '',
      'Maintenance Date': toIsoDateOnly(actual?.maintenanceDate) ?? '',
      Time: actual?.maintenanceTime ?? '',
      'Hour Meter': actual?.hourMeter ?? '',
      Mechanics: actual?.mechanics ?? '',
      Remarks: actual?.remarks ?? '',
      'QC Status': actual?.qcStatus ?? '',
      'Actual PIC': picLabel(actual?.pic),
      Severity: failure.severity,
      Finding: failure.description,
      Component: failure.componentCode ?? '',
      'Component Name': failure.componentName ?? '',
      'Sub Component': failure.subComponentCode ?? '',
      'Sub Component Name': failure.subComponentName ?? '',
      Damage: failure.damageCode ?? '',
      'Damage Name': failure.damageName ?? '',
      'Finding Date': failure.occurredAt,
      'Closed On': failure.closureDate ?? '',
      'Failure PIC': failure.picName ?? ''
    })
  })
}

async function picIdByLabel(label: string, cache: Map<string, number | 'ambiguous' | 'missing'>): Promise<number | null | 'bad'> {
  const key = label.trim().toLowerCase()
  if (!key) return null
  const cached = cache.get(key)
  if (cached === 'ambiguous' || cached === 'missing') return 'bad'
  if (typeof cached === 'number') return cached

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ username: label.trim() }, { fullName: label.trim() }]
    },
    select: { idUser: true }
  })
  if (users.length !== 1) {
    cache.set(key, users.length > 1 ? 'ambiguous' : 'missing')

    return 'bad'
  }
  cache.set(key, users[0].idUser)

  return users[0].idUser
}

export async function importActualSheet(
  session: Session,
  rawRows: Record<string, unknown>[],
  createdByIdInput: number
): Promise<{
  actualsCreated: number
  actualsUpdated: number
  failuresCreated: number
  failuresUpdated: number
  errors?: SheetError[]
}> {
  const createdById = parseCreatedById(createdByIdInput, createdByIdInput)
  const errors: SheetError[] = []
  if (!createdById) {
    return {
      actualsCreated: 0,
      actualsUpdated: 0,
      failuresCreated: 0,
      failuresUpdated: 0,
      errors: [{ row: 0, message: 'createdById is required' }]
    }
  }

  const lines: ParsedSheetLine[] = []
  rawRows.forEach((raw, index) => {
    const row = Number(raw?.row) || index + 2

    const empty =
      !textCell(raw, 'Unit', 'unitNo') &&
      !textCell(raw, 'Register No', 'registerNo') &&
      !textCell(raw, 'Maintenance Type', 'Program') &&
      sheetCell(raw, 'Plan Date', 'planDate') === '' &&
      !textCell(raw, 'Finding', 'description')
    if (empty) return
    const parsed = parseLine(raw, row)
    if (!parsed.ok) {
      errors.push(parsed.error)

      return
    }
    lines.push(parsed.line)
  })

  if (!lines.length && !errors.length) {
    errors.push({
      row: 0,
      message:
        'File kosong atau format kolom tidak sesuai (harus berisi Unit, Maintenance Type, Plan Date, dan kolom temuan bila ada).'
    })
  }

  const groups = new Map<string, ParsedSheetLine[]>()
  for (const line of lines) {
    const key = sheetGroupKey({
      unitNo: line.unitNo,
      program: line.program,
      planDateIso: line.planDateIso,
      registerNo: line.registerNo
    })
    if (!key) {
      errors.push({
        row: line.row,
        message: 'Unit, Maintenance Type, and Plan Date are required (or an existing Register No)'
      })
      continue
    }
    const list = groups.get(key) ?? []
    list.push(line)
    groups.set(key, list)
  }

  const [types, units] = await Promise.all([
    prisma.maintenanceType.findMany({ select: { id: true, name: true } }),
    prisma.fleetUnitCache.findMany({ select: { fleetUnitId: true, unitNo: true, projectCode: true } })
  ])
  const typeByName = new Map(types.map(type => [type.name.trim().toLowerCase(), type.id]))
  const unitByNo = new Map<string, { fleetUnitId: number; projectCode: string }>()
  const duplicateUnitNos = new Set<string>()
  for (const unit of units) {
    const key = unit.unitNo.trim().toUpperCase()
    if (unitByNo.has(key)) duplicateUnitNos.add(key)
    else unitByNo.set(key, { fleetUnitId: unit.fleetUnitId, projectCode: unit.projectCode })
  }

  const picCache = new Map<string, number | 'ambiguous' | 'missing'>()
  let actualsCreated = 0
  let actualsUpdated = 0
  let failuresCreated = 0
  let failuresUpdated = 0

  for (const [, group] of groups) {
    const first = group[0]
    let actualId = ''

    if (first.registerNo && !(first.unitNo && first.program && first.planDateIso)) {
      const existing = await prisma.maintenanceActual.findUnique({
        where: { registerNo: first.registerNo },
        include: { maintenancePlan: { select: { projectId: true } } }
      })
      if (!existing) {
        errors.push({ row: first.row, message: `Register No "${first.registerNo}" was not found` })
        continue
      }
      if (!canAccessProject(session, existing.maintenancePlan.projectId)) {
        errors.push({ row: first.row, message: 'Project is outside your scope' })
        continue
      }
      actualId = existing.id
      actualsUpdated += 1
    } else {
      if (duplicateUnitNos.has(first.unitNo.toUpperCase())) {
        errors.push({ row: first.row, message: `Unit "${first.unitNo}" is not unique` })
        continue
      }
      const unit = unitByNo.get(first.unitNo.toUpperCase())
      if (!unit) {
        errors.push({ row: first.row, message: `Unit "${first.unitNo}" not found` })
        continue
      }
      if (first.project && first.project.toUpperCase() !== unit.projectCode.toUpperCase()) {
        errors.push({
          row: first.row,
          message: `Unit "${first.unitNo}" belongs to project ${unit.projectCode}, not ${first.project}`
        })
        continue
      }
      if (!canAccessProject(session, unit.projectCode)) {
        errors.push({ row: first.row, message: 'Project is outside your scope' })
        continue
      }
      const maintenanceTypeId = typeByName.get(first.program.toLowerCase())
      if (!maintenanceTypeId) {
        errors.push({ row: first.row, message: `Program "${first.program}" not found` })
        continue
      }
      const planDate = parsePlanDateInput(first.planDateIso)
      if (!planDate) {
        errors.push({ row: first.row, message: 'Plan Date is required' })
        continue
      }

      const detail = await prisma.maintenancePlanDetail.findFirst({
        where: {
          fleetUnitId: unit.fleetUnitId,
          planDate: planDate.date,
          maintenancePlan: { projectId: unit.projectCode, maintenanceTypeId }
        },
        include: { actuals: { select: { id: true, registerNo: true }, take: 1 } }
      })
      if (!detail) {
        errors.push({
          row: first.row,
          message: `No plan date for ${first.unitNo} on ${first.planDateIso} (${first.program})`
        })
        continue
      }

      const existing = detail.actuals[0]
      if (existing) {
        if (first.registerNo && existing.registerNo.toUpperCase() !== first.registerNo.toUpperCase()) {
          errors.push({
            row: first.row,
            message: `Plan date already has register ${existing.registerNo}, not ${first.registerNo}`
          })
          continue
        }
        actualId = existing.id
        actualsUpdated += 1
      } else {
        const source = group.find(line => line.maintenanceDateIso && line.hourMeter != null) ?? first
        if (!source.maintenanceDateIso) {
          errors.push({ row: first.row, message: 'Maintenance Date is required for a new actual' })
          continue
        }
        if (source.hourMeter == null) {
          errors.push({ row: first.row, message: 'Hour Meter is required for a new actual' })
          continue
        }
        const actualPic = await picIdByLabel(source.actualPic, picCache)
        if (actualPic === 'bad') {
          errors.push({ row: source.row, message: `Actual PIC "${source.actualPic}" was not found` })
          continue
        }

        const created = await createMaintenanceActual(
          {
            maintenancePlanDetailId: detail.id,
            maintenanceDate: source.maintenanceDateIso,
            maintenanceTime: source.time,
            hourMeter: source.hourMeter,
            remarks: source.remarks || null,
            mechanics: source.mechanics || null,
            qcStatus: source.qcStatus || null,
            picUserId: actualPic,
            createdById
          },
          createdById
        )
        if (!created.ok) {
          errors.push({ row: first.row, message: created.error })
          continue
        }
        actualId = created.maintenanceActual.id
        actualsCreated += 1
      }
    }

    for (const line of group) {
      if (!line.hasFinding) continue
      if (!line.severity || !line.finding || !line.componentCode || !line.subComponentCode || !line.damageCode) {
        errors.push({
          row: line.row,
          message: 'A finding needs severity, description, component, sub component, and damage'
        })
        continue
      }
      const occurredAt = line.findingDateIso ? new Date(`${line.findingDateIso}T00:00:00.000Z`) : undefined

      const duplicate = await prisma.maintenanceFailure.findFirst({
        where: {
          maintenanceActualId: actualId,
          description: line.finding,
          componentCode: line.componentCode,
          subComponentCode: line.subComponentCode,
          damageCode: line.damageCode,
          ...(occurredAt ? { occurredAt } : {})
        },
        select: { id: true }
      })
      if (duplicate) {
        failuresUpdated += 1
        continue
      }
      const failurePic = await picIdByLabel(line.failurePic, picCache)
      if (failurePic === 'bad') {
        errors.push({ row: line.row, message: `Failure PIC "${line.failurePic}" was not found` })
        continue
      }

      const saved = await syncActualFailures(
        actualId,
        {
          created: [
            {
              clientKey: `row-${line.row}`,
              severity: line.severity,
              description: line.finding,
              componentCode: line.componentCode,
              subComponentCode: line.subComponentCode,
              damageCode: line.damageCode,
              occurredAt: line.findingDateIso || null,
              closureDate: line.closedOnIso || null,
              picUserId: failurePic
            }
          ]
        },
        createdById
      )
      if (!saved.ok) {
        errors.push({ row: line.row, message: saved.error })
        continue
      }
      failuresCreated += 1
    }
  }

  return {
    actualsCreated,
    actualsUpdated,
    failuresCreated,
    failuresUpdated,
    errors: errors.length ? errors : undefined
  }
}
