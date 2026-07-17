import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { getInspectionTypeByCode } from '@/lib/inspection/types'
import { listInspectionRecords } from '@/lib/inspection/service'
import { normalizeEvalCode, RATING_EXCEL_COLOR, type SosRating } from '@/lib/ratings'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { fleetId: string }
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const fleetUnitId = Number(params.fleetId)
  if (Number.isNaN(fleetUnitId)) {
    return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 })
  }

  const type = request.nextUrl.searchParams.get('type')
  if (!type) {
    return NextResponse.json({ error: 'type query parameter is required' }, { status: 400 })
  }

  const typeMeta = getInspectionTypeByCode(type)
  const rows = await listInspectionRecords(session, { fleetUnitId, type })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(typeMeta?.label ?? type)

  sheet.columns = [
    { header: 'Inspection Date', key: 'insDate', width: 14 },
    { header: 'Component', key: 'compDesc', width: 22 },
    { header: 'HM', key: 'insHm', width: 10 },
    { header: 'Rating', key: 'rating', width: 10 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const excelRow = sheet.addRow({
      insDate: row.insDate ? String(row.insDate).slice(0, 10) : '',
      compDesc: row.commod?.comp?.compDesc ?? '',
      insHm: row.insHm ?? '',
      rating: row.rating ?? ''
    })

    applyRatingColor(excelRow.getCell(4), row.rating)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const slug = typeMeta?.slug ?? type.toLowerCase()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="inspection-${slug}-${fleetUnitId}.xlsx"`
    }
  })
}
