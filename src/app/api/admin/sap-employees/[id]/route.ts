/**
 * GET    /api/admin/sap-employees/:id — one EmployeesInfo row.
 * PUT    /api/admin/sap-employees/:id — update NIK / status / branch / etc.
 * PATCH  /api/admin/sap-employees/:id — activate or deactivate (record status only).
 */
import { NextRequest, NextResponse } from 'next/server'

import { logActivity } from '@/lib/activity-log'
import {
  activateEmployee,
  deactivateEmployee,
  getEmployee,
  updateEmployee,
  type EmployeeWriteInput
} from '@/lib/sap-b1/employees-service'
import { SapB1ConfigError, SapB1DisabledError, SapB1UnavailableError } from '@/lib/sap-b1/config'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

type Ctx = { params: Promise<{ id: string }> }

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

function parseId(raw: string): number | null {
  const id = Number(raw)

  return Number.isInteger(id) && id > 0 ? id : null
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

export async function GET(request: NextRequest, context: Ctx) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'sap-employees.read')
  if (forbidden) return forbidden

  const id = parseId((await context.params).id)
  if (id === null) return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 })

  try {
    const employee = await getEmployee(id)
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    return NextResponse.json({ employee })
  } catch (error) {
    return sapErrorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'sap-employees.update')
  if (forbidden) return forbidden

  const id = parseId((await context.params).id)
  if (id === null) return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const employee = await updateEmployee(id, parseWriteBody(body))
    logActivity({
      session,
      logName: 'sap-employees',
      description: `Updated SAP employee ${employee.employeeId} (NIK ${employee.nik})`,
      properties: { employeeId: employee.employeeId, nik: employee.nik, recordStatus: employee.recordStatus }
    })

    return NextResponse.json({ employee })
  } catch (error) {
    return sapErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'sap-employees.update')
  if (forbidden) return forbidden

  const id = parseId((await context.params).id)
  if (id === null) return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = String(body.action ?? '')
    .trim()
    .toLowerCase()

  try {
    const employee =
      action === 'deactivate'
        ? await deactivateEmployee(id)
        : action === 'activate'
          ? await activateEmployee(id)
          : null

    if (!employee) {
      return NextResponse.json({ error: 'action must be activate or deactivate' }, { status: 400 })
    }

    logActivity({
      session,
      logName: 'sap-employees',
      description: `${action === 'activate' ? 'Activated' : 'Deactivated'} SAP employee ${employee.employeeId}`,
      properties: { employeeId: employee.employeeId, nik: employee.nik, action }
    })

    return NextResponse.json({ employee })
  } catch (error) {
    return sapErrorResponse(error)
  }
}
