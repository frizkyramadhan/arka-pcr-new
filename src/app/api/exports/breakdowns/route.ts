/**
 * GET /api/exports/breakdowns — Excel board of every unit in a project.
 * BD units include open-breakdown detail. RFU units appear without BD columns filled.
 */
import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listBreakdownBoard } from '@/lib/dmbd/report-board'
import { groupBreakdownReportRows } from '@/lib/dmbd/report-layout'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListSearch } from '@/lib/utils/list-search'
import { formatWallClockDate } from '@/lib/utils/wall-clock'

function formatHm(value: number | null): string | number {
  if (value == null) return ''

  return value
}

function formatBdStart(value: string): string {
  if (!value) return ''
  const text = formatWallClockDate(value, '')
  if (!text) return ''

  // Compact board export: 10 Jan 25
  const match = /^(\d{2}) (\w{3}) (\d{4})$/.exec(text)

  return match ? `${match[1]} ${match[2]} ${match[3].slice(2)}` : text
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, ['reports.access', 'breakdown.read'])
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const projectCode = searchParams.get('projectCode') || searchParams.get('projectId') || ''
  if (!projectCode.trim()) {
    return NextResponse.json({ error: 'Choose a project' }, { status: 400 })
  }

  const rows = await listBreakdownBoard(session, {
    projectCode,
    fleetUnitId: searchParams.get('fleetUnitId') || searchParams.get('unitId') || undefined,
    status: searchParams.get('status') || undefined,
    q: parseListSearch(searchParams) || undefined,
    plantGroup: searchParams.get('plantGroup') || undefined,
    plantType: searchParams.get('plantType') || undefined
  })

  const board = groupBreakdownReportRows(rows)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Breakdown')

  sheet.columns = [
    { header: 'NO', key: 'no', width: 6 },
    { header: 'UNIT', key: 'unit', width: 16 },
    { header: 'RFU', key: 'rfu', width: 8 },
    { header: 'BD', key: 'bd', width: 8 },
    { header: 'HM BD', key: 'hmBd', width: 12 },
    { header: 'HM Update', key: 'hmUpdate', width: 12 },
    { header: 'DESCRIPTION', key: 'problem', width: 40 },
    { header: 'BD START DATE', key: 'started', width: 14 },
    { header: 'AGING BD', key: 'aging', width: 12 },
    { header: 'STATUS', key: 'status', width: 28 },
    { header: 'ETA RFU DATE', key: 'eta', width: 14 },
    { header: 'ETA RFU IF PART SUPPLIED', key: 'etaPart', width: 24 }
  ]
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

  for (const row of board) {
    if (row.rowType === 'group') {
      const excelRow = sheet.addRow({ unit: row.groupLabel || row.unitNo })
      excelRow.font = { bold: true }
      excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6A5AB' } }
      continue
    }

    if (row.rowType === 'total') {
      const excelRow = sheet.addRow({
        unit: 'Total',
        rfu: row.statusRfu,
        bd: row.statusBd
      })
      excelRow.font = { bold: true }
      excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF59D' } }
      continue
    }

    sheet.addRow({
      no: row.listNo,
      unit: row.unitNo,
      rfu: row.statusRfu,
      bd: row.statusBd,
      hmBd: formatHm(row.hourMeter),
      hmUpdate: formatHm(row.hmUpdate),
      problem: row.problem,
      started: formatBdStart(row.startedAt),
      aging: row.agingBd,
      status: row.processStatus,
      eta: row.etaRfuDate || '',
      etaPart: row.etaRfuIfPart == null ? '' : `${row.etaRfuIfPart} day${row.etaRfuIfPart === 1 ? '' : 's'}`
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="breakdown-summary.xlsx"'
    }
  })
}
