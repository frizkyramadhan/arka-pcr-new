/**
 * GET /api/exports/maintenance — Excel summary of maintenance actuals (FMS).
 */
import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { listMaintenanceActuals } from '@/lib/fms/maintenance-actuals'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { formatDisplayDate } from '@/lib/utils/date-only'
import { parseListSearch } from '@/lib/utils/list-search'

const MONTH_NAMES = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'reports.access',
    'maintenance-actual.read',
    'exports.maintenance'
  ])
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl

  const { maintenanceActuals } = await listMaintenanceActuals({
    projectId: searchParams.get('projectCode') ?? searchParams.get('projectId') ?? undefined,
    projectCode: searchParams.get('projectCode') ?? undefined,
    maintenanceTypeId: searchParams.get('maintenanceTypeId') ?? undefined,
    fleetUnitId: searchParams.get('fleetUnitId') ?? undefined,
    unitId: searchParams.get('unitId') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    search: parseListSearch(searchParams) ?? undefined
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Maintenance Actuals')

  sheet.columns = [
    { header: 'Project', key: 'project', width: 12 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Period', key: 'period', width: 12 },
    { header: 'Unit No', key: 'unitNo', width: 14 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Time', key: 'time', width: 10 },
    { header: 'Hour Meter', key: 'hourMeter', width: 12 },
    { header: 'Mechanics', key: 'mechanics', width: 24 },
    { header: 'Remarks', key: 'remarks', width: 36 },
    { header: 'Created By', key: 'createdBy', width: 14 }
  ]

  sheet.getRow(1).font = { bold: true }

  for (const row of maintenanceActuals) {
    const period =
      row.planYear != null && row.planMonth != null
        ? `${MONTH_NAMES[row.planMonth] ?? row.planMonth} ${row.planYear}`
        : ''

    sheet.addRow({
      project: row.planProjectId ?? '',
      type: row.planTypeName ?? '',
      period,
      unitNo: row.unitNo ?? row.unitCode ?? '',
      date: formatDisplayDate(row.maintenanceDate),
      time: row.maintenanceTime ?? '',
      hourMeter: row.hourMeter,
      mechanics: row.mechanics ?? '',
      remarks: row.remarks ?? '',
      createdBy: row.createdByUsername ?? ''
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="maintenance-summary.xlsx"'
    }
  })
}
