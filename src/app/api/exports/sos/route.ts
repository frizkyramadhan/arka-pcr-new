import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { normalizeEvalCode, RATING_EXCEL_COLOR, type SosRating } from '@/lib/ratings'
import { listSosRecords } from '@/lib/sos/service'
import { requireSession } from '@/lib/utils/api-auth'
import { parseListSearch } from '@/lib/utils/list-search'

function applyEvalColor(cell: ExcelJS.Cell, evalCode: string | null | undefined) {
  const rating = normalizeEvalCode(evalCode)
  if (!rating) return

  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: RATING_EXCEL_COLOR[rating as SosRating] }
  }
  cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl

  const rows = await listSosRecords(session, {
    projectCode: searchParams.get('projectCode'),
    fleetUnitId:
      searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
        ? Number(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))
        : null,
    evalCode: searchParams.get('evalCode'),
    idMod: searchParams.get('idMod') ? Number(searchParams.get('idMod')) : null,
    sampleDateFrom: searchParams.get('sampleDateFrom'),
    sampleDateTo: searchParams.get('sampleDateTo'),
    search: parseListSearch(searchParams)
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('SOS Summary')

  sheet.columns = [
    { header: 'Project', key: 'projectCode', width: 10 },
    { header: 'Sample Date', key: 'sampleDate', width: 12 },
    { header: 'Unit No', key: 'unitNo', width: 12 },
    { header: 'Component', key: 'compDesc', width: 20 },
    { header: 'Lab No', key: 'labNo', width: 14 },
    { header: 'Evaluation Code', key: 'evalCode', width: 16 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const excelRow = sheet.addRow({
      projectCode: row.projectCode,
      sampleDate: row.sampleDate ? String(row.sampleDate).slice(0, 10) : '',
      unitNo: row.unitNo,
      compDesc: row.commod?.comp?.compDesc ?? '',
      labNo: row.labNo ?? '',
      evalCode: row.evalCode ?? ''
    })

    applyEvalColor(excelRow.getCell(6), row.evalCode)
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="sos-summary.xlsx"'
    }
  })
}
