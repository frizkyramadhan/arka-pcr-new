import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { normalizeEvalCode, RATING_EXCEL_COLOR, type SosRating } from '@/lib/ratings'
import { listSosRecords } from '@/lib/sos/service'
import { requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { fleetId: string }
}

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

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const fleetUnitId = Number(params.fleetId)
  if (Number.isNaN(fleetUnitId)) {
    return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 })
  }

  const rows = await listSosRecords(session, { fleetUnitId })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('SOS')

  sheet.columns = [
    { header: 'Sample Date', key: 'sampleDate', width: 12 },
    { header: 'Component', key: 'compDesc', width: 20 },
    { header: 'Lab No', key: 'labNo', width: 14 },
    { header: 'Eval Code', key: 'evalCode', width: 10 },
    { header: 'Fe', key: 'fe', width: 8 },
    { header: 'Cu', key: 'cu', width: 8 },
    { header: 'Cr', key: 'cr', width: 8 },
    { header: 'Visc', key: 'visc', width: 8 },
    { header: 'TBN', key: 'tbn', width: 8 },
    { header: 'Water', key: 'water', width: 8 },
    { header: 'Recommendation', key: 'recommendation', width: 30 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const excelRow = sheet.addRow({
      sampleDate: row.sampleDate ? String(row.sampleDate).slice(0, 10) : '',
      compDesc: row.commod?.comp?.compDesc ?? '',
      labNo: row.labNo ?? '',
      evalCode: row.evalCode ?? '',
      fe: row.fe ? Number(row.fe) : '',
      cu: row.cu ? Number(row.cu) : '',
      cr: row.cr ? Number(row.cr) : '',
      visc: row.visc ? Number(row.visc) : '',
      tbn: row.tbn ? Number(row.tbn) : '',
      water: row.water ? Number(row.water) : '',
      recommendation: row.recommendation ?? ''
    })

    applyEvalColor(excelRow.getCell(4), row.evalCode)
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sos-${fleetUnitId}.xlsx"`
    }
  })
}
