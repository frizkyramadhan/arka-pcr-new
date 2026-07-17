import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createInspectionRecord, listInspectionRecordsPaginated } from '@/lib/inspection/service'
import { inspectionCreateSchema } from '@/lib/validations/inspection'
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

  const result = await listInspectionRecordsPaginated(session, {
    fleetUnitId: fleetUnitId ? Number(fleetUnitId) : null,
    idMod: idMod ? Number(idMod) : null,
    type: searchParams.get('type'),
    rating: searchParams.get('rating'),
    projectCode: searchParams.get('projectCode'),
    insDateFrom: searchParams.get('insDateFrom'),
    insDateTo: searchParams.get('insDateTo'),
    search: parseListSearch(searchParams)
  }, pagination)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'inspections.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = inspectionCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await createInspectionRecord(session, parsed.data, Number(session.user.id) || undefined)

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create inspection record'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
