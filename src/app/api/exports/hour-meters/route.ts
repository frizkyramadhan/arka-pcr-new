/**
 * Export hour meters ke Excel — mengikuti filter query yang sama dengan list API.
 */
import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { setupHourMeterSheet, toExcelDateCell } from '@/lib/hour-meter/excel'
import { listHourMeters, parseHourMeterListQuery } from '@/lib/hour-meter/service'
import { requireSession } from '@/lib/utils/api-auth'
import { isHeadOffice } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const query = parseHourMeterListQuery(request.nextUrl.searchParams)

  if (!isHeadOffice(session)) {
    query.projectCode = null
  }

  const rows = await listHourMeters(session, {
    fleetUnitId: query.fleetUnitId,
    projectCode: query.projectCode,
    search: query.search,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    hmUnitMin: query.hmUnitMin,
    hmUnitMax: query.hmUnitMax
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Hour Meters')
  setupHourMeterSheet(sheet)

  for (const row of rows) {
    sheet.addRow({
      id_hm: row.idHm,
      unit_no: row.unitNo,
      description: row.unit?.description ?? '',
      project_code: row.projectCode,
      hm_unit: Number(row.hmUnit),
      wh_day: row.whDay,
      date_hm: toExcelDateCell(row.dateHm) ?? ''
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="hour-meters.xlsx"'
    }
  })
}
