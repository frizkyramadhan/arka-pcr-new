/**
 * GET  /api/admin/sap-employees — all EmployeesInfo rows matching filters (no UI page-size).
 *      Requires at least one filter; empty filter → { data: [], total: 0 } without calling SAP list.
 * POST /api/admin/sap-employees — create employee in SAP.
 */
import { NextRequest, NextResponse } from 'next/server'

import { logActivity } from '@/lib/activity-log'
import {
  createEmployee,
  hasEmployeeListFilter,
  listEmployeesByFilter,
  type EmployeeWriteInput
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
  const message = error instanceof Error ? error.message : 'SAP employee request failed'

  return NextResponse.json({ error: message }, { status: 400 })
}

function parseWriteBody(body: Record<string, unknown>): EmployeeWriteInput {
  return {
    firstName: String(body.firstName ?? ''),
    middleName: body.middleName == null ? '' : String(body.middleName),
    lastName: body.lastName == null ? '' : String(body.lastName),
    nik: String(body.nik ?? ''),
    branch: body.branch === '' || body.branch == null ? null : Number(body.branch),
    department: body.department === '' || body.department == null ? null : Number(body.department),
    position: body.position === '' || body.position == null ? null : Number(body.position),
    empCategory: body.empCategory == null ? '' : String(body.empCategory),
    isMechanic: String(body.isMechanic ?? 'N').toUpperCase() as 'Y' | 'N',
    recordStatus: String(body.recordStatus ?? 'A').toUpperCase() as 'A' | 'D',
    jobTitle: body.jobTitle == null ? '' : String(body.jobTitle)
  }
}

function parseListFilters(params: URLSearchParams) {
  const branchRaw = params.get('branch')
  const departmentRaw = params.get('department')
  const positionRaw = params.get('position')

  const mechanicRaw = String(params.get('isMechanic') ?? '')
    .trim()
    .toUpperCase()

  const statusRaw = String(params.get('recordStatus') ?? '')
    .trim()
    .toUpperCase()

  return {
    q: params.get('q') ?? undefined,
    branch: branchRaw ? Number(branchRaw) : null,
    department: departmentRaw ? Number(departmentRaw) : null,
    position: positionRaw ? Number(positionRaw) : null,
    empCategory: params.get('empCategory') ?? '',
    isMechanic: (mechanicRaw === 'Y' || mechanicRaw === 'N' ? mechanicRaw : '') as 'Y' | 'N' | '',
    recordStatus: (statusRaw === 'A' || statusRaw === 'D' ? statusRaw : '') as 'A' | 'D' | ''
  }
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'sap-employees.read')
  if (forbidden) return forbidden

  const filters = parseListFilters(request.nextUrl.searchParams)
  if (!hasEmployeeListFilter(filters)) {
    return NextResponse.json({
      data: [],
      total: 0,
      requiresFilter: true,
      message: 'Set at least one filter and search'
    })
  }

  try {
    // List only — do not refresh Branches/Departments/Positions here (that parallel SAP load
    // often times out → 502). UI already has meta from GET /meta and maps Position names locally.
    const list = await listEmployeesByFilter(filters)

    return NextResponse.json({ data: list.data, total: list.total })
  } catch (error) {
    return sapErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'sap-employees.create')
  if (forbidden) return forbidden

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const employee = await createEmployee(parseWriteBody(body))
    logActivity({
      session,
      logName: 'sap-employees',
      description: `Created SAP employee ${employee.employeeId} (NIK ${employee.nik})`,
      properties: { employeeId: employee.employeeId, nik: employee.nik }
    })

    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    return sapErrorResponse(error)
  }
}
