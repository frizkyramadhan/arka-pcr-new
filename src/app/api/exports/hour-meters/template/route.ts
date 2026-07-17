import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { setupHourMeterSheet, toExcelDateCell } from '@/lib/hour-meter/excel'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Hour Meters')
  setupHourMeterSheet(sheet)

  sheet.addRow({
    id_hm: '',
    unit_no: 'DT-001',
    description: 'Dump Truck 100T',
    project_code: 'PRJ1',
    hm_unit: 12500.5,
    wh_day: 8,
    date_hm: toExcelDateCell('2026-01-15')
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="hour-meter-template.xlsx"'
    }
  })
}
