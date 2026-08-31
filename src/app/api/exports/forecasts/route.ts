import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listForecasts } from '@/lib/forecasts/service'
import { requireSession } from '@/lib/utils/api-auth'
import { formatDisplayDate, toIsoDateOnly } from '@/lib/utils/date-only'
import { parseListSearch } from '@/lib/utils/list-search'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Plan period as month-yy (e.g. Jul-26). */
function formatPlanPeriodShort(planPeriod: unknown) {
  const iso = toIsoDateOnly(planPeriod as string | Date | null | undefined) ?? ''
  if (!/^\d{4}-\d{2}/.test(iso)) return ''

  const year = iso.slice(2, 4)
  const month = Number(iso.slice(5, 7))

  return `${MONTHS_SHORT[month - 1]}-${year}`
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl

  const fleetUnitId = searchParams.get('fleetUnitId')
  const idMod = searchParams.get('idMod')
  const planPeriod = searchParams.get('planPeriod')?.trim()
  const planMonth = searchParams.get('planMonth')?.trim()

  let resolvedPlanPeriod: string | null = null
  if (planMonth && /^\d{4}-\d{2}$/.test(planMonth)) {
    resolvedPlanPeriod = `${planMonth}-01`
  } else if (planPeriod) {
    resolvedPlanPeriod = /^\d{4}-\d{2}$/.test(planPeriod) ? `${planPeriod}-01` : planPeriod
  }

  const rows = await listForecasts(session, {
    projectCode: searchParams.get('projectCode'),
    quarter: searchParams.get('quarter'),
    planPeriod: resolvedPlanPeriod,
    status: searchParams.get('status'),
    baPcrStatus: searchParams.get('baPcrStatus'),
    fleetUnitId: fleetUnitId ? Number(fleetUnitId) : null,
    idMod: idMod ? Number(idMod) : null,
    search: parseListSearch(searchParams)
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Forecast Summary')

  sheet.columns = [
    { header: 'Model Unit', key: 'modelName', width: 14 },
    { header: 'No Unit', key: 'unitNo', width: 12 },
    { header: 'Component', key: 'compDesc', width: 20 },
    { header: 'HM Component', key: 'hmComponent', width: 14 },
    { header: 'Policy', key: 'policy', width: 10 },
    { header: 'Life Time Component', key: 'lifePercent', width: 16 },
    { header: 'Rating S.O.S', key: 'ratingSos', width: 12 },
    { header: 'Price Component', key: 'priceComponent', width: 14 },
    { header: 'Plan Periode', key: 'planPeriod', width: 12 },
    { header: 'Project', key: 'projectCode', width: 10 },
    { header: 'Quarter', key: 'quarter', width: 8 },
    { header: 'BA PCR', key: 'noBaPcr', width: 28 },
    { header: 'Status BA PCR', key: 'baPcrStatus', width: 14 },
    { header: 'Tanggal Pengajuan BA PCR', key: 'baSubmittedAt', width: 18 },
    { header: 'No WO', key: 'woNo', width: 14 },
    { header: 'STATUS PCR', key: 'woStatus', width: 12 },
    { header: 'ACTION DATE PCR', key: 'convertedAt', width: 16 },
    { header: 'PO', key: 'poNo', width: 14 },
    { header: 'REMARK', key: 'remark', width: 24 },
    { header: 'RETURN OLD COMP', key: 'returnOldcoreDate', width: 16 },
    { header: 'SPB/BA RETURN OLD COMP', key: 'spbBaReturnOldcore', width: 22 }
  ]

  sheet.getRow(1).font = { bold: true }
  sheet.getCell('I1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9F43' } }
  sheet.getCell('I1').font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getCell('O1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28C76F' } }
  sheet.getCell('O1').font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getCell('T1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00CFE8' } }
  sheet.getCell('T1').font = { bold: true, color: { argb: 'FFFFFFFF' } }

  for (const row of rows) {
    sheet.addRow({
      modelName: row.modelName ?? '',
      unitNo: row.unitNo,
      compDesc: row.compDesc ?? row.commod?.comp?.compDesc ?? '',
      hmComponent: row.hmComponent != null ? Number(row.hmComponent) : '',
      policy: row.policy ?? '',
      lifePercent: row.lifePercent != null ? Number(row.lifePercent) : '',
      ratingSos: row.ratingSos ?? '',
      priceComponent: row.priceComponent != null ? Number(row.priceComponent) : '',
      planPeriod: formatPlanPeriodShort(row.planPeriod),
      projectCode: row.projectCode ?? '',
      quarter: row.quarter,
      noBaPcr: row.noBaPcr ?? '',
      baPcrStatus: row.baPcrStatus ?? '',
      baSubmittedAt: formatDisplayDate(row.baSubmittedAt),
      woNo: row.replacement?.woNo ?? '',
      woStatus: row.replacement?.woStatus ?? '',
      convertedAt: formatDisplayDate(row.convertedAt),
      poNo: row.replacement?.poNo ?? '',
      remark: row.remark ?? '',
      returnOldcoreDate: formatDisplayDate(row.replacement?.returnOldcoreDate),
      spbBaReturnOldcore: row.replacement?.spbBaReturnOldcore ?? ''
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="forecast-summary.xlsx"'
    }
  })
}
