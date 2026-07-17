import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { getInspectionTypeByCode } from '@/lib/inspection/types'
import { listInspectionRecords } from '@/lib/inspection/service'
import { normalizeEvalCode, RATING_EXCEL_COLOR, type SosRating } from '@/lib/ratings'
import { requireSession } from '@/lib/utils/api-auth'
import { parseListSearch } from '@/lib/utils/list-search'

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

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type')

  const rows = await listInspectionRecords(session, {
    projectCode: searchParams.get('projectCode'),
    type,
    rating: searchParams.get('rating'),
    idMod: searchParams.get('idMod') ? Number(searchParams.get('idMod')) : null,
    fleetUnitId:
      searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
        ? Number(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))
        : null,
    insDateFrom: searchParams.get('insDateFrom'),
    insDateTo: searchParams.get('insDateTo'),
    search: parseListSearch(searchParams)
  })

  const typeMeta = type ? getInspectionTypeByCode(type) : null
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(typeMeta?.label ?? 'Inspections')

  sheet.columns = [
    { header: 'Project', key: 'projectCode', width: 10 },
    { header: 'Inspection Date', key: 'insDate', width: 14 },
    { header: 'Unit No', key: 'unitNo', width: 12 },
    { header: 'Component', key: 'compDesc', width: 20 },
    { header: 'Hour Meter', key: 'insHm', width: 12 },
    { header: 'Inspection Type', key: 'type', width: 16 },
    { header: 'Rating', key: 'rating', width: 10 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const excelRow = sheet.addRow({
      projectCode: row.projectCode,
      insDate: row.insDate ? String(row.insDate).slice(0, 10) : '',
      unitNo: row.unitNo,
      compDesc: row.commod?.comp?.compDesc ?? '',
      insHm: row.insHm ?? '',
      type: row.type,
      rating: row.rating ?? ''
    })

    applyRatingColor(excelRow.getCell(7), row.rating)
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inspection-summary.xlsx"'
    }
  })
}
