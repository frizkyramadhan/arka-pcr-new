import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listCannibalRecords } from '@/lib/cannibal/service'
import { parseCannibalListFilters } from '@/lib/cannibal/list-filters'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { toIsoDateOnly } from '@/lib/utils/date-only'

function pairField(
  pairs: Array<Record<string, any>> | undefined,
  side: 'remove' | 'install',
  field: string
): string {
  if (!pairs?.length) return ''

  const values = pairs
    .map(pair => pair?.[side]?.[field])
    .filter(value => value != null && String(value).trim() !== '')
    .map(value => String(value).trim())

  return [...new Set(values)].join(', ')
}

function removeModel(pairs: Array<Record<string, any>> | undefined): string {
  if (!pairs?.length) return ''

  const values = pairs
    .map(pair => pair?.remove?.unit?.modelName)
    .filter(value => value != null && String(value).trim() !== '')
    .map(value => String(value).trim())

  return [...new Set(values)].join(', ')
}

function plantStatementLabel(row: Record<string, any>): string {
  if (row.plantOther) return row.plantOtherText ? `Other — ${row.plantOtherText}` : 'Other'
  if (row.plantProductionReq) return 'Production Requirements'
  if (row.plantP1UnitRfu) return 'P1 Unit RFU'

  return ''
}

function logisticStatementLabel(row: Record<string, any>): string {
  if (row.logisticOther) return row.logisticOtherText ? `Other — ${row.logisticOtherText}` : 'Other'
  if (row.logisticLeadTime) {
    return row.logisticLeadTimeDays
      ? `Lead Time Part (Est ${row.logisticLeadTimeDays} days)`
      : 'Lead Time Part'
  }
  if (row.logisticNoStock) return 'No Stock'

  return ''
}

function woNoLabel(pairs: Array<Record<string, any>> | undefined): string {
  const removeWo = pairField(pairs, 'remove', 'woNoKanibal')
  const installWo = pairField(pairs, 'install', 'woNoKanibal')
  if (!removeWo && !installWo) return ''
  if (removeWo && installWo && removeWo !== installWo) return `${removeWo} / ${installWo}`

  return removeWo || installWo
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'exports.cannibal')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const parsedFilters = parseCannibalListFilters(searchParams)

  const rows = await listCannibalRecords(session, parsedFilters)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Cannibal Summary')

  sheet.columns = [
    { header: 'BA No', key: 'noBa', width: 18 },
    { header: 'Project', key: 'projectCode', width: 10 },
    { header: 'Posting Date', key: 'postingDate', width: 14 },
    { header: 'Model (Remove)', key: 'removedModel', width: 16 },
    { header: 'Removed Unit', key: 'removedUnitNo', width: 14 },
    { header: 'Installed Unit', key: 'installedUnitNo', width: 14 },
    { header: 'HM Component Remove', key: 'hmCompRemove', width: 20 },
    { header: 'HM Component Install', key: 'hmCompInstall', width: 20 },
    { header: 'Part Number', key: 'pn', width: 16 },
    { header: 'Component', key: 'compDesc', width: 22 },
    { header: 'Plant Statement', key: 'plantStatement', width: 22 },
    { header: 'Logistic Statement', key: 'logisticStatement', width: 22 },
    { header: 'Status', key: 'statusBa', width: 16 },
    { header: 'Planning Action', key: 'planningAction', width: 28 },
    { header: 'WO No', key: 'woNo', width: 16 },
    { header: 'MR No', key: 'mrNo', width: 14 },
    { header: 'PR No', key: 'prNo', width: 14 },
    { header: 'PO No', key: 'poNo', width: 14 },
    { header: 'Symptom', key: 'symptom', width: 28 },
    { header: 'Failure', key: 'failure', width: 28 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const pairs = (row as { pairs?: Array<Record<string, any>> }).pairs

    sheet.addRow({
      noBa: row.noBa,
      projectCode: row.projectCode,
      postingDate: toIsoDateOnly(row.postingDate) ?? '',
      removedModel: removeModel(pairs),
      removedUnitNo: pairField(pairs, 'remove', 'unitNo'),
      installedUnitNo: pairField(pairs, 'install', 'unitNo'),
      hmCompRemove: pairField(pairs, 'remove', 'hmComp'),
      hmCompInstall: pairField(pairs, 'install', 'hmComp'),
      pn: pairField(pairs, 'remove', 'pn') || pairField(pairs, 'install', 'pn'),
      compDesc: pairField(pairs, 'remove', 'compDesc') || pairField(pairs, 'install', 'compDesc'),
      plantStatement: plantStatementLabel(row),
      logisticStatement: logisticStatementLabel(row),
      statusBa: row.statusBa,
      planningAction: (row as { baAction?: { action?: string | null } }).baAction?.action ?? '',
      woNo: woNoLabel(pairs),
      mrNo: row.mrNo ?? '',
      prNo: row.prNo ?? '',
      poNo: row.poNo ?? '',
      symptom: row.symptom ?? '',
      failure: row.failure ?? ''
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="cannibal-summary.xlsx"'
    }
  })
}
