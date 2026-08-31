import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listConditionRecords } from '@/lib/condition/service'
import { normalizeEvalCode, RATING_EXCEL_COLOR, type SosRating } from '@/lib/ratings'
import { requireSession } from '@/lib/utils/api-auth'
import { formatDisplayDate } from '@/lib/utils/date-only'

type RouteContext = {
  params: { fleetId: string }
}

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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const fleetUnitId = Number(params.fleetId)
  if (Number.isNaN(fleetUnitId)) {
    return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 })
  }

  const rows = await listConditionRecords(session, { fleetUnitId })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Condition')

  sheet.columns = [
    { header: 'Component', key: 'compDesc', width: 22 },
    { header: 'Overall', key: 'condition', width: 12 },
    { header: 'SOS', key: 'sosRating', width: 8 },
    { header: 'FC', key: 'fcRating', width: 8 },
    { header: 'MPS', key: 'mpsRating', width: 8 },
    { header: 'VI', key: 'viRating', width: 8 },
    { header: 'TA2', key: 'ta2Rating', width: 8 },
    { header: 'ED', key: 'edRating', width: 8 },
    { header: 'Evaluated At', key: 'evaluatedAt', width: 14 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const excelRow = sheet.addRow({
      compDesc: row.commod?.comp?.compDesc ?? '',
      condition: row.condition,
      sosRating: row.sosRating ?? '',
      fcRating: row.fcRating ?? '',
      mpsRating: row.mpsRating ?? '',
      viRating: row.viRating ?? '',
      ta2Rating: row.ta2Rating ?? '',
      edRating: row.edRating ?? '',
      evaluatedAt: formatDisplayDate(row.evaluatedAt)
    })

    applyConditionColor(excelRow.getCell(2), row.condition)
    applyRatingColor(excelRow.getCell(3), row.sosRating)
    applyRatingColor(excelRow.getCell(4), row.fcRating)
    applyRatingColor(excelRow.getCell(5), row.mpsRating)
    applyRatingColor(excelRow.getCell(6), row.viRating)
    applyRatingColor(excelRow.getCell(7), row.ta2Rating)
    applyRatingColor(excelRow.getCell(8), row.edRating)
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="condition-${fleetUnitId}.xlsx"`
    }
  })
}
