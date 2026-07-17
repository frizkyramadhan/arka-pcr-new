import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createSosRecord, listSosRecordsPaginated } from '@/lib/sos/service'
import { sosCreateSchema } from '@/lib/validations/sos'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'
import { parseListSearch } from '@/lib/utils/list-search'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const pagination = parseListPagination(searchParams)
  const fleetUnitId = searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')
  const idMod = searchParams.get('idMod') ?? searchParams.get('modelComponentId')

  const result = await listSosRecordsPaginated(session, {
    fleetUnitId: fleetUnitId ? Number(fleetUnitId) : null,
    idMod: idMod ? Number(idMod) : null,
    evalCode: searchParams.get('evalCode'),
    projectCode: searchParams.get('projectCode'),
    sampleDateFrom: searchParams.get('sampleDateFrom'),
    sampleDateTo: searchParams.get('sampleDateTo'),
    search: parseListSearch(searchParams)
  }, pagination)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'sos.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = sosCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await createSosRecord(session, parsed.data, Number(session.user.id) || undefined)

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create SOS record'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
