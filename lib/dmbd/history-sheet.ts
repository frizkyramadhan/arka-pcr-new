/**
 * Breakdown history Excel — seed import + dump export (site daily-report columns).
 * Does not create or close SAP work orders. WO link is best-effort by DocNum.
 */
import type { BreakdownPosition, Prisma } from '@prisma/client'
import type { Session } from 'next-auth'
import ExcelJS from 'exceljs'

import {
  episodePositionStatus,
  isOpenBdPositionEpisode,
  latestActivity
} from '@/lib/dmbd/breakdowns'
import { nextBreakdownRegisterNo } from '@/lib/dmbd/register-no'
import { prisma } from '@/lib/prisma'
import { getServiceCall } from '@/lib/sap-b1/documents-service'
import { resolveProjectFilter } from '@/lib/utils/project-scope'
import {
  cellText,
  normalizeWorkOrder,
  parseHistoryStamp,
  workOrderDocNum
} from '@/lib/dmbd/history-sheet-parse'

export { normalizeWorkOrder, parseHistoryStamp, workOrderDocNum } from '@/lib/dmbd/history-sheet-parse'

/** Simplified seed columns. Project is taken from unit_no (fleet cache). */
export const HISTORY_HEADERS = [
  'unit_no',
  'hm',
  'wo_sap',
  'status_unit',
  'bd_code',
  'description',
  'bd_date',
  'finish_date',
  'comp_code',
  'remarks'
] as const

export type HistorySheetRow = {
  excelRow: number
  unitNo: string
  hourMeter: number | null
  workOrder: string
  statusUnit: string
  breakdownCode: string
  problem: string
  startedAt: Date | null
  finishedAt: Date | null
  componentCode: string
  remark: string
}

export type HistoryImportResult = {
  createdBreakdowns: number
  createdActivities: number
  skipped: number
  linkedSap: number
  errors: { row: number; message: string }[]
}

const POSITIONS = new Set(['BD', 'OP', 'SB', 'AJ'])

function normHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseHm(value: unknown): number | null {
  const raw = cellText(value).replace(/,/g, '')
  if (!raw) return null
  const num = Number(raw)

  return Number.isFinite(num) ? num : null
}

function mapStatusUnit(raw: string): { finished: boolean; position: BreakdownPosition } {
  const value = raw.trim().toUpperCase()
  if (value === 'RFU') return { finished: true, position: 'BD' }
  if (POSITIONS.has(value)) return { finished: false, position: value as BreakdownPosition }

  return { finished: false, position: 'BD' }
}

function headerIndex(sheet: ExcelJS.Worksheet): Map<string, number> | null {
  const row = sheet.getRow(1)
  const map = new Map<string, number>()
  row.eachCell((cell, col) => {
    const key = normHeader(cell.value)
    if (key) map.set(key, col)
  })
  const needed = ['unit', 'description', 'bd date']
  if (!needed.every(key => [...map.keys()].some(header => header.includes(key) || key.includes(header)))) {
    // Require UNIT and DESCRIPTION at minimum via exact-ish keys
  }
  if (![...map.keys()].some(key => key === 'unit' || key === 'unit_no' || key.startsWith('unit'))) return null
  if (![...map.keys()].some(key => key.includes('description') || key === 'problem')) return null
  if (
    ![...map.keys()].some(
      key => key === 'bd_date' || key.includes('bd date') || key.includes('bd_date') || key.includes('start')
    )
  ) {
    return null
  }

  return map
}

function col(map: Map<string, number>, ...aliases: string[]): number | null {
  for (const alias of aliases) {
    const want = normHeader(alias)
    for (const [key, index] of map) {
      if (key === want || key.includes(want)) return index
    }
  }

  return null
}

export async function parseHistoryWorkbook(buffer: ArrayBuffer | Buffer): Promise<HistorySheetRow[]> {
  const workbook = new ExcelJS.Workbook()

  // ExcelJS accepts Buffer; Node Buffer is fine at runtime.
  await workbook.xlsx.load(buffer as never)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const map = headerIndex(sheet)
  if (!map) throw new Error('Sheet header must include unit_no, description, and bd_date')

  const iUnit = col(map, 'unit_no', 'UNIT')!
  const iHm = col(map, 'hm', 'HM')
  const iWo = col(map, 'wo_sap', 'WO SAP', 'WO')
  const iStatusUnit = col(map, 'status_unit', 'STATUS UNIT')
  const iCode = col(map, 'bd_code', 'B/D CODE', 'BD CODE')
  const iProblem = col(map, 'description', 'DESCRIPTION', 'PROBLEM')!
  const iStart = col(map, 'bd_date', 'BD DATE', 'START DATE')!
  const iFinish = col(map, 'finish_date', 'FINISH DATE')
  const iComponent = col(map, 'comp_code', 'Component Code', 'COMPONENT CODE')
  const iRemark = col(map, 'remarks', 'REMARK', 'REMARKS')

  const rows: HistorySheetRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const unitNo = cellText(row.getCell(iUnit).value)
    const problem = cellText(row.getCell(iProblem).value)
    if (!unitNo && !problem) return

    rows.push({
      excelRow: rowNumber,
      unitNo,
      hourMeter: iHm ? parseHm(row.getCell(iHm).value) : null,
      workOrder: iWo ? normalizeWorkOrder(cellText(row.getCell(iWo).value)) : '',
      statusUnit: iStatusUnit ? cellText(row.getCell(iStatusUnit).value) : '',
      breakdownCode: iCode ? cellText(row.getCell(iCode).value) : '',
      problem,
      startedAt: parseHistoryStamp(row.getCell(iStart).value),
      finishedAt: iFinish ? parseHistoryStamp(row.getCell(iFinish).value) : null,
      componentCode: iComponent ? cellText(row.getCell(iComponent).value) : '',
      remark: iRemark ? cellText(row.getCell(iRemark).value) : ''
    })
  })

  return rows
}

async function linkSapServiceCallId(workOrder: string): Promise<number | null> {
  const docNum = workOrderDocNum(workOrder)
  if (docNum == null) return null
  try {
    const call = await getServiceCall(docNum)
    const id = Number(call?.docEntry)
    if (Number.isInteger(id) && id > 0) return id
  } catch {
    return null
  }

  return null
}

function uniqueKey(unitNo: string, workOrder: string, startedAt: Date): string {
  const wo = normalizeWorkOrder(workOrder)
  if (wo) return `${unitNo.trim().toUpperCase()}|WO|${wo}`

  return `${unitNo.trim().toUpperCase()}|T|${startedAt.toISOString()}`
}

/** Excel of row-level import errors for download after seed. */
export async function buildHistoryImportErrorWorkbook(
  errors: { row: number; message: string }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Import Errors')
  sheet.addRow(['Row', 'Message'])
  sheet.getRow(1).font = { bold: true }
  for (const error of errors) {
    sheet.addRow([error.row, error.message])
  }
  sheet.getColumn(1).width = 10
  sheet.getColumn(2).width = 80

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

/** Seed history rows into MySQL. Insert-only; same WO merges as extra activity. */
export async function importBreakdownHistory(
  rows: HistorySheetRow[],
  userId: number,
  canAccess: (projectCode: string) => boolean,
  projectCodeFilter?: string
): Promise<HistoryImportResult> {
  const result: HistoryImportResult = {
    createdBreakdowns: 0,
    createdActivities: 0,
    skipped: 0,
    linkedSap: 0,
    errors: []
  }

  const units = await prisma.fleetUnitCache.findMany({
    where: projectCodeFilter?.trim()
      ? { projectCode: projectCodeFilter.trim() }
      : undefined,
    select: { fleetUnitId: true, unitNo: true, projectCode: true }
  })
  const unitByNo = new Map<string, { fleetUnitId: number; projectCode: string; unitNo: string }>()
  for (const unit of units) {
    unitByNo.set(unit.unitNo.trim().toUpperCase(), {
      fleetUnitId: unit.fleetUnitId,
      projectCode: unit.projectCode,
      unitNo: unit.unitNo
    })
  }

  const existing = await prisma.breakdown.findMany({
    where: projectCodeFilter?.trim() ? { projectCode: projectCodeFilter.trim() } : undefined,
    select: {
      id: true,
      fleetUnitId: true,
      workOrder: true,
      startedAt: true,
      finishedAt: true,
      fleetUnit: { select: { unitNo: true } },
      activities: { select: { startedAt: true, createdAt: true, positionStatus: true } }
    }
  })

  const keyToBreakdownId = new Map<string, string>()
  for (const row of existing) {
    const unitNo = row.fleetUnit.unitNo
    keyToBreakdownId.set(uniqueKey(unitNo, row.workOrder || '', row.startedAt), row.id)
  }

  const openBdByUnit = new Map<number, string>()
  for (const row of existing) {
    if (row.finishedAt) continue
    if (!isOpenBdPositionEpisode(row.activities)) continue
    openBdByUnit.set(row.fleetUnitId, row.id)
  }

  // Process in sheet order so same-WO activity merges see the parent created earlier in-file.
  for (const row of rows) {
    try {
      if (!row.unitNo.trim()) {
        result.errors.push({ row: row.excelRow, message: 'UNIT is required' })
        continue
      }
      if (!row.problem.trim()) {
        result.errors.push({ row: row.excelRow, message: 'DESCRIPTION is required' })
        continue
      }
      if (!row.startedAt) {
        result.errors.push({ row: row.excelRow, message: 'BD DATE is invalid' })
        continue
      }

      const unit = unitByNo.get(row.unitNo.trim().toUpperCase())
      if (!unit) {
        result.errors.push({ row: row.excelRow, message: `Unit "${row.unitNo}" not found in project cache` })
        continue
      }
      if (!canAccess(unit.projectCode)) {
        result.errors.push({ row: row.excelRow, message: `No access to project ${unit.projectCode}` })
        continue
      }

      const status = mapStatusUnit(row.statusUnit)
      const finishedAt = status.finished || row.finishedAt ? row.finishedAt || row.startedAt : null
      const position = status.position
      const key = uniqueKey(unit.unitNo, row.workOrder, row.startedAt)
      const existingId = keyToBreakdownId.get(key)

      // Same WO (or same unit+start) already imported → add activity, or skip exact dup.
      if (existingId) {
        if (!row.workOrder.trim()) {
          result.skipped += 1
          continue
        }
        if (position === 'BD') {
          const parent = await prisma.breakdown.findUnique({
            where: { id: existingId },
            select: {
              finishedAt: true,
              activities: { select: { startedAt: true, createdAt: true, positionStatus: true } }
            }
          })
          if (parent && !parent.finishedAt && isOpenBdPositionEpisode(parent.activities)) {
            result.errors.push({
              row: row.excelRow,
              message: 'Same WO already has an open BD-position activity; use AJ/OP/SB'
            })
            continue
          }
        }
        await prisma.breakdownActivity.create({
          data: {
            breakdownId: existingId,
            sapActivityCode: null,
            activityCategory: 'WO',
            breakdownCode: (row.breakdownCode || 'IMP').slice(0, 8),
            breakdownCodeName: 'Imported history',
            positionStatus: position,
            startedAt: row.startedAt,
            endedAt: finishedAt,
            details: row.problem,
            technicianName: null,
            technicianQty: null,
            handledBy: userId,
            createdById: userId
          }
        })
        result.createdActivities += 1
        continue
      }

      if (!finishedAt && position === 'BD' && openBdByUnit.has(unit.fleetUnitId)) {
        result.errors.push({
          row: row.excelRow,
          message: 'Unit already has an open BD-position breakdown; use status_unit AJ or close BD first'
        })
        continue
      }

      let sapServiceCallId: number | null = null
      if (row.workOrder.trim()) {
        sapServiceCallId = await linkSapServiceCallId(row.workOrder)
        if (sapServiceCallId) result.linkedSap += 1
      }

      const resolution = finishedAt
        ? row.remark.trim() || 'Imported history'
        : null

      const registerNo = await nextBreakdownRegisterNo(prisma, unit.projectCode, row.startedAt)

      const created = await prisma.breakdown.create({
        data: {
          registerNo,
          projectCode: unit.projectCode,
          fleetUnitId: unit.fleetUnitId,
          startedAt: row.startedAt,
          finishedAt,
          problem: row.problem,
          hourMeter: row.hourMeter,
          remark: row.remark || null,
          workOrder: row.workOrder || null,
          sapServiceCallId,
          workOrderStatus: finishedAt ? 'CLOSE' : 'OPEN',
          componentCode: row.componentCode || null,
          resolution,
          createdById: userId,
          activities: {
            create: {
              sapActivityCode: null,
              activityCategory: 'WO',
              breakdownCode: (row.breakdownCode || 'IMP').slice(0, 8),
              breakdownCodeName: 'Imported history',
              positionStatus: position,
              startedAt: row.startedAt,
              endedAt: finishedAt,
              details: row.problem,
              technicianName: null,
              technicianQty: null,
              handledBy: userId,
              createdById: userId
            }
          }
        },
        select: { id: true }
      })

      keyToBreakdownId.set(key, created.id)
      if (!finishedAt && position === 'BD') openBdByUnit.set(unit.fleetUnitId, created.id)
      result.createdBreakdowns += 1
      result.createdActivities += 1
    } catch (error) {
      result.errors.push({
        row: row.excelRow,
        message: error instanceof Error ? error.message : 'Import failed'
      })
    }
  }

  return result
}

function formatStamp(value: Date | null): string {
  if (!value) return ''

  // Prisma DATETIME = wall-clock via UTC getters (same as UI).
  const pad = (n: number) => String(n).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return `${pad(value.getUTCDate())} ${months[value.getUTCMonth()]} ${String(value.getUTCFullYear()).slice(2)} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`
}

/** Dump breakdowns (latest activity) to the site daily-report sheet shape. */
export async function buildHistoryWorkbook(
  session: Session,
  query: {
    projectCode?: string
    fleetUnitId?: string
    status?: string
    bdFrom?: string
    bdTo?: string
  }
): Promise<{ buffer: Buffer; filename: string }> {
  const where = resolveProjectFilter(session, query.projectCode || '')
  if (where.projectCode === '__NONE__') {
    const empty = new ExcelJS.Workbook()
    empty.addWorksheet('Breakdown History')
    const buffer = Buffer.from(await empty.xlsx.writeBuffer())

    return { buffer, filename: 'breakdown-history.xlsx' }
  }

  const unitId = Number(query.fleetUnitId)
  const started: Prisma.DateTimeFilter = {}
  if (query.bdFrom) started.gte = new Date(`${query.bdFrom}T00:00:00`)
  if (query.bdTo) started.lte = new Date(`${query.bdTo}T23:59:59.999`)

  const rows = await prisma.breakdown.findMany({
    where: {
      ...where,
      ...(Number.isInteger(unitId) && unitId > 0 ? { fleetUnitId: unitId } : {}),
      ...(Object.keys(started).length ? { startedAt: started } : {}),
      ...(query.status === 'open' ? { finishedAt: null, cancelledAt: null } : {}),
      ...(query.status === 'closed' ? { finishedAt: { not: null }, cancelledAt: null } : {}),
      ...(query.status === 'cancelled' ? { cancelledAt: { not: null } } : {})
    },
    include: {
      fleetUnit: { select: { unitNo: true } },
      activities: {
        select: {
          startedAt: true,
          createdAt: true,
          positionStatus: true,
          breakdownCode: true
        }
      }
    },
    orderBy: [{ startedAt: 'desc' }]
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Breakdown History')
  sheet.addRow([...HISTORY_HEADERS])
  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const latest = latestActivity(row.activities)
    const statusUnit = row.finishedAt ? 'RFU' : episodePositionStatus(row.activities)
    sheet.addRow([
      row.fleetUnit.unitNo,
      row.hourMeter == null ? '' : Number(row.hourMeter),
      row.workOrder || '',
      statusUnit,
      latest?.breakdownCode || '',
      row.problem,
      formatStamp(row.startedAt),
      formatStamp(row.finishedAt),
      row.componentCode || '',
      row.remark || row.resolution || ''
    ])
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const project = (query.projectCode || 'all').trim() || 'all'

  return { buffer, filename: `breakdown-history-${project}.xlsx` }
}
