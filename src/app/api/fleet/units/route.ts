import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listUnitsQuery, parseUnitListQuery } from '@/lib/fleet-api/equipment-service'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const query = parseUnitListQuery(request.nextUrl.searchParams)
  const requestedProject = request.nextUrl.searchParams.get('projectCode')?.trim()

  if (requestedProject) {
    query.projectCode = canAccessProject(session, requestedProject) ? requestedProject : '__NONE__'
  }

  const result = await listUnitsQuery(session, query)

  return NextResponse.json(result, {
    headers: {
      'X-Fleet-Source': result.source,
      'X-Fleet-Enabled': String(isFleetApiEnabled())
    }
  })
}
