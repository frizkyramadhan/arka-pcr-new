import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listReplacements } from '@/lib/replacement/service'
import { requireSession } from '@/lib/utils/api-auth'
import { formatDisplayDate } from '@/lib/utils/date-only'
import { parseListSearch } from '@/lib/utils/list-search'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl

  const repMonth = searchParams.get('repMonth')?.trim()
  const repDateParam = searchParams.get('repDate')?.trim()

  let resolvedRepDate: string | null = null
  if (repMonth && /^\d{4}-\d{2}$/.test(repMonth)) {
    resolvedRepDate = `${repMonth}-01`
  } else if (repDateParam) {
    resolvedRepDate = /^\d{4}-\d{2}$/.test(repDateParam) ? `${repDateParam}-01` : repDateParam
  }

  const rows = await listReplacements(session, {
    projectCode: searchParams.get('projectCode'),
    woStatus: searchParams.get('status'),
    repDate: resolvedRepDate,
    fleetUnitId:
      searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
        ? Number(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))
        : null,
    idMod: searchParams.get('idMod') ? Number(searchParams.get('idMod')) : null,
    search: parseListSearch(searchParams)
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('PCR Summary')

  sheet.columns = [
    { header: 'Model Unit', key: 'modelName', width: 14 },
    { header: 'No Unit', key: 'unitNo', width: 12 },
    { header: 'Component', key: 'compDesc', width: 20 },
    { header: 'HM Component', key: 'hmRep', width: 14 },
    { header: 'Rep Date', key: 'repDate', width: 12 },
    { header: 'WO Date', key: 'woDate', width: 12 },
    { header: 'Life Time Component', key: 'lifePercent', width: 16 },
    { header: 'Project', key: 'projectCode', width: 10 },
    { header: 'BA PCR', key: 'noBaPcr', width: 28 },
    { header: 'Status BA PCR', key: 'baPcrStatus', width: 14 },
    { header: 'WO', key: 'woNo', width: 14 },
    { header: 'STATUS WO', key: 'woStatus', width: 12 },
    { header: 'MR No', key: 'mrNo', width: 14 },
    { header: 'PR No', key: 'prNo', width: 14 },
    { header: 'PO', key: 'poNo', width: 14 },
    { header: 'REMARK', key: 'remarks', width: 24 },
    { header: 'RETURN OLD COMP', key: 'returnOldcoreDate', width: 16 },
    { header: 'SPB/BA RETURN OLD COMP', key: 'spbBaReturnOldcore', width: 22 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    sheet.addRow({
      modelName: row.unit?.modelName ?? '',
      unitNo: row.unitNo,
      compDesc: row.commod?.comp?.compDesc ?? '',
      hmRep: row.hmRep != null ? Number(row.hmRep) : '',
      repDate: formatDisplayDate(row.repDate),
      woDate: formatDisplayDate(row.woDate),
      lifePercent:
        row.woStatus === 'CLOSE'
          ? row.lifePercent != null
            ? Number(row.lifePercent)
            : ''
          : row.liveMetrics?.lifePercent ?? '',
      projectCode: row.projectCode,
      noBaPcr: row.linkedForecast?.noBaPcr ?? '',
      baPcrStatus: row.linkedForecast?.baPcrStatus ?? '',
      woNo: row.woNo ?? row.idRep,
      woStatus: row.woStatus,
      mrNo: row.mrNo ?? '',
      prNo: row.prNo ?? '',
      poNo: row.poNo ?? '',
      remarks: row.remarks ?? '',
      returnOldcoreDate: formatDisplayDate(row.returnOldcoreDate),
      spbBaReturnOldcore: row.spbBaReturnOldcore ?? ''
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pcr-summary.xlsx"'
    }
  })
}
