import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listUnitsByProjectUnscoped, listUnitsQuery, parseUnitListQuery } from '@/lib/fleet-api/equipment-service'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const query = parseUnitListQuery(request.nextUrl.searchParams)
  const requestedProject = request.nextUrl.searchParams.get('projectCode')?.trim()
  const unscoped = request.nextUrl.searchParams.get('unscoped') === '1'

  if (unscoped) {
    const forbidden = requireAnyPermissionOrForbidden(session, ['cannibals.create', 'cannibals.update'])
    if (forbidden) return forbidden
    if (!requestedProject) {
      return NextResponse.json({ error: 'projectCode is required' }, { status: 400 })
    }

    query.projectCode = requestedProject
    const result = await listUnitsByProjectUnscoped(query)

    return NextResponse.json(result, {
      headers: {
        'X-Fleet-Source': result.source,
        'X-Fleet-Enabled': String(isFleetApiEnabled())
      }
    })
  }

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
