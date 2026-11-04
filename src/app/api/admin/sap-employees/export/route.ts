/**
 * GET /api/admin/sap-employees/export — Excel of EmployeesInfo (same filters as list).
 * GET ?template=1 — empty template + lookup sheets.
 */
import { NextRequest, NextResponse } from 'next/server'

import {
  buildEmployeeExportWorkbook,
  buildEmployeeTemplateWorkbook
} from '@/lib/sap-b1/employees-sheet'
import {
  attachEmpCategoryNames,
  attachPositionNames,
  getEmployeeLookupMeta,
  hasEmployeeListFilter,
  listEmployeesByFilter
} from '@/lib/sap-b1/employees-service'
import { SapB1ConfigError, SapB1DisabledError, SapB1UnavailableError } from '@/lib/sap-b1/config'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

function sapErrorResponse(error: unknown) {
  if (error instanceof SapB1DisabledError || error instanceof SapB1ConfigError) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }
  if (error instanceof SapB1UnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 502 })
  }
  const message = error instanceof Error ? error.message : 'SAP employee export failed'

  return NextResponse.json({ error: message }, { status: 400 })
}

function xlsxResponse(buffer: Buffer, filename: string) {
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'sap-employees.read')
  if (forbidden) return forbidden

  const params = request.nextUrl.searchParams
  const asTemplate = params.get('template') === '1' || params.get('template') === 'true'

  try {
    const meta = await getEmployeeLookupMeta()

    if (asTemplate) {
      const buffer = await buildEmployeeTemplateWorkbook(
        meta.branches,
        meta.departments,
        meta.positions,
        meta.empCategories
      )

      return xlsxResponse(buffer, 'sap-employees-template.xlsx')
    }

    const branchRaw = params.get('branch')
    const departmentRaw = params.get('department')
    const positionRaw = params.get('position')

    const mechanicRaw = String(params.get('isMechanic') ?? '')
      .trim()
      .toUpperCase()

    const statusRaw = String(params.get('recordStatus') ?? '')
      .trim()
      .toUpperCase()

    const filters = {
      q: params.get('q') ?? undefined,
      branch: branchRaw ? Number(branchRaw) : null,
      department: departmentRaw ? Number(departmentRaw) : null,
      position: positionRaw ? Number(positionRaw) : null,
      empCategory: params.get('empCategory') ?? '',
      isMechanic: (mechanicRaw === 'Y' || mechanicRaw === 'N' ? mechanicRaw : '') as 'Y' | 'N' | '',
      recordStatus: (statusRaw === 'A' || statusRaw === 'D' ? statusRaw : '') as 'A' | 'D' | ''
    }

    if (!hasEmployeeListFilter(filters)) {
      return NextResponse.json({ error: 'Set at least one filter before export' }, { status: 400 })
    }

    const list = await listEmployeesByFilter(filters)
    const withPosition = attachPositionNames(list.data, meta.positions)
    const employees = attachEmpCategoryNames(withPosition, meta.empCategories)

    const { buffer, filename } = await buildEmployeeExportWorkbook(
      employees,
      meta.branches,
      meta.departments,
      meta.positions,
      meta.empCategories
    )

    return xlsxResponse(buffer, filename)
  } catch (error) {
    return sapErrorResponse(error)
  }
}
