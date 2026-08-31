import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listConditionRecords } from '@/lib/condition/service'
import { normalizeEvalCode, RATING_EXCEL_COLOR, type SosRating } from '@/lib/ratings'
import { requireSession } from '@/lib/utils/api-auth'
import { formatDisplayDate } from '@/lib/utils/date-only'
import { parseListSearch } from '@/lib/utils/list-search'

const CONDITION_COLORS: Record<string, string> = {
  CRITICAL: 'FFEA5455',
  ATTENTION: 'FFFF9F43',
  NORMAL: 'FF28C76F',
  MONITOR: 'FFFF9F43',
  GOOD: 'FF28C76F'
}

function applyRatingColor(cell: ExcelJS.Cell, rating: string | null | undefined) {
  const normalized = normalizeEvalCode(rating)
  if (!normalized) return

  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: RATING_EXCEL_COLOR[normalized as SosRating] }
  }
  cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
}

function applyConditionColor(cell: ExcelJS.Cell, condition: string) {
  const color = CONDITION_COLORS[condition]
  if (!color) return

  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color }
  }
  cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
}

function getBasisLabel(row: {
  fcRating?: string | null
  mpsRating?: string | null
  viRating?: string | null
  ta2Rating?: string | null
  edRating?: string | null
  sosRating?: string | null
}) {
  const hasInspection = [row.fcRating, row.mpsRating, row.viRating, row.ta2Rating, row.edRating].some(Boolean)
  if (hasInspection) return 'Inspection'
  if (row.sosRating) return 'SOS'

  return ''
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl

  const rows = await listConditionRecords(session, {
    projectCode: searchParams.get('projectCode'),
    condition: searchParams.get('condition'),
    sosRating: searchParams.get('sosRating'),
    idMod: searchParams.get('idMod') ? Number(searchParams.get('idMod')) : null,
    fleetUnitId:
      searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
        ? Number(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))
        : null,
    evaluatedAtFrom: searchParams.get('evaluatedAtFrom'),
    evaluatedAtTo: searchParams.get('evaluatedAtTo'),
    search: parseListSearch(searchParams)
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Condition Summary')

  sheet.columns = [
    { header: 'Project', key: 'projectCode', width: 10 },
    { header: 'Unit No', key: 'unitNo', width: 12 },
    { header: 'Component', key: 'compDesc', width: 20 },
    { header: 'Overall', key: 'condition', width: 12 },
    { header: 'Basis', key: 'basis', width: 12 },
    { header: 'SOS', key: 'sosRating', width: 8 },
    { header: 'FC', key: 'fcRating', width: 8 },
    { header: 'MPS', key: 'mpsRating', width: 8 },
    { header: 'VI', key: 'viRating', width: 8 },
    { header: 'TA2', key: 'ta2Rating', width: 8 },
    { header: 'ED', key: 'edRating', width: 8 },
    { header: 'Evaluated', key: 'evaluatedAt', width: 12 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const excelRow = sheet.addRow({
      projectCode: row.projectCode,
      unitNo: row.unitNo,
      compDesc: row.commod?.comp?.compDesc ?? '',
      condition: row.condition,
      basis: getBasisLabel(row),
      sosRating: row.sosRating ?? '',
      fcRating: row.fcRating ?? '',
      mpsRating: row.mpsRating ?? '',
      viRating: row.viRating ?? '',
      ta2Rating: row.ta2Rating ?? '',
      edRating: row.edRating ?? '',
      evaluatedAt: formatDisplayDate(row.evaluatedAt)
    })

    applyConditionColor(excelRow.getCell(4), row.condition)
    applyRatingColor(excelRow.getCell(6), row.sosRating)
    applyRatingColor(excelRow.getCell(7), row.fcRating)
    applyRatingColor(excelRow.getCell(8), row.mpsRating)
    applyRatingColor(excelRow.getCell(9), row.viRating)
    applyRatingColor(excelRow.getCell(10), row.ta2Rating)
    applyRatingColor(excelRow.getCell(11), row.edRating)
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="condition-summary.xlsx"'
    }
  })
}
