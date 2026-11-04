/**
 * GET /api/admin/sap-employees/meta — branches, departments, positions (cached).
 * Loaded on page open without querying EmployeesInfo.
 */
import { NextRequest, NextResponse } from 'next/server'

import { getEmployeeLookupMeta } from '@/lib/sap-b1/employees-service'
import { SapB1ConfigError, SapB1DisabledError, SapB1UnavailableError } from '@/lib/sap-b1/config'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'sap-employees.read')
  if (forbidden) return forbidden

  try {
    const meta = await getEmployeeLookupMeta()

    return NextResponse.json(meta)
  } catch (error) {
    if (error instanceof SapB1DisabledError || error instanceof SapB1ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    if (error instanceof SapB1UnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    const message = error instanceof Error ? error.message : 'Failed to load employee lookups'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
