import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { fleetId: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const fleetUnitId = Number(params.fleetId)
  if (Number.isNaN(fleetUnitId)) {
    return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 })
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('SOS Import')

  const headers = ['sample_date', 'id_mod', 'lab_name', 'lab_no', 'oil_type', 'eval_code', 'fe', 'cu', 'visc', 'tbn', 'water']
  sheet.addRow(headers)
  sheet.addRow([
    '2026-01-15',
    '',
    'Lab ABC',
    'LAB-001',
    'Engine Oil',
    'A',
    10.5,
    2.1,
    45.2,
    8.5,
    0.1
  ])

  sheet.getRow(1).font = { bold: true }
  sheet.getCell('A2').note = `fleet_equipment_id=${fleetUnitId} (set via import form or add id_mod column)`

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sos-import-template-${fleetUnitId}.xlsx"`
    }
  })
}
