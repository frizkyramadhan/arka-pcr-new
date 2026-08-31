import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listReplacements } from '@/lib/replacement/service'
import { resolveOpenHmRepDisplay } from '@/lib/replacement/hm-rep'
import { requireSession } from '@/lib/utils/api-auth'
import { formatDisplayDate } from '@/lib/utils/date-only'

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

  const rows = await listReplacements(session, { fleetUnitId })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('PCR Replacements')

  sheet.columns = [
    { header: 'WO No', key: 'woNo', width: 14 },
    { header: 'Component', key: 'compDesc', width: 22 },
    { header: 'Rep Date', key: 'repDate', width: 12 },
    { header: 'HM Rep', key: 'hmRep', width: 12 },
    { header: 'Status', key: 'woStatus', width: 10 },
    { header: 'Life %', key: 'lifePercent', width: 10 },
    { header: 'Live Life %', key: 'liveLife', width: 12 },
    { header: 'Remarks', key: 'remarks', width: 30 }
  ]

  for (const row of rows) {
    sheet.addRow({
      woNo: row.woNo ?? row.idRep,
      compDesc: row.commod?.comp?.compDesc ?? '',
      repDate: formatDisplayDate(row.repDate),
      hmRep: resolveOpenHmRepDisplay(row, row.liveMetrics?.hmNow) ?? Number(row.hmRep),
      woStatus: row.woStatus,
      lifePercent: row.woStatus === 'CLOSE' ? Number(row.lifePercent) : '',
      liveLife: row.liveMetrics?.lifePercent ?? '',
      remarks: row.remarks
    })
  }

  sheet.getRow(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="pcr-replacements-${fleetUnitId}.xlsx"`
    }
  })
}
