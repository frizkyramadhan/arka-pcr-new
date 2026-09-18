/**
 * GET /api/maintenance-types — list (q). POST — create maintenance type.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  createMaintenanceType,
  listMaintenanceTypes
} from '@/lib/fms/maintenance-types'
import {
  requireAnyPermissionOrForbidden,
  requirePermissionOrForbidden,
  requireSession
} from '@/lib/utils/api-auth'

function queryRecord(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'maintenance-type.read',
    'reports.access'
  ])
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const params = queryRecord(searchParams)

  try {
    const result = await listMaintenanceTypes({ q: params.q })

    return NextResponse.json({ ...result, params })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list maintenance types'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-type.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const name = body?.name

  try {
    const result = await createMaintenanceType(typeof name === 'string' ? name : String(name ?? ''))
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ maintenanceType: result.maintenanceType }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create maintenance type'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
