/**
 * GET open failures for a unit. POST records findings and follows for one actual.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listUnitFailures, syncActualFailures } from '@/lib/fms/maintenance-failures'
import { requireAnyPermissionOrForbidden, requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.read')
  if (forbidden) return forbidden

  const fleetUnitId = Number(request.nextUrl.searchParams.get('fleetUnitId'))
  const actualId = request.nextUrl.searchParams.get('actualId')?.trim() || undefined
  if (!Number.isInteger(fleetUnitId) || fleetUnitId <= 0) {
    return NextResponse.json({ error: 'fleetUnitId is required' }, { status: 400 })
  }

  const result = await listUnitFailures(fleetUnitId, actualId)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'maintenance-actual.create',
    'maintenance-actual.update'
  ])
  if (forbidden) return forbidden

  const body = await request.json()
  const actualId = String(body?.actualId ?? '').trim()
  if (!actualId) {
    return NextResponse.json({ error: 'actualId is required' }, { status: 400 })
  }

  const result = await syncActualFailures(
    actualId,
    {
      follows: body?.follows,
      recorded: body?.recorded,
      created: body?.created
    },
    Number(session.user.id)
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
