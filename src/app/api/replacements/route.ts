import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  createReplacement,
  listLatestReplacementsByComponentPaginated,
  listReplacementsPaginated
} from '@/lib/replacement/service'
import { replacementCreateSchema } from '@/lib/validations/replacement'
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
  const woStatus = searchParams.get('status') ?? searchParams.get('woStatus')
  const repMonth = searchParams.get('repMonth')?.trim()
  const repDateParam = searchParams.get('repDate')?.trim()

  let resolvedRepDate: string | null = null
  if (repMonth && /^\d{4}-\d{2}$/.test(repMonth)) {
    resolvedRepDate = `${repMonth}-01`
  } else if (repDateParam) {
    resolvedRepDate = /^\d{4}-\d{2}$/.test(repDateParam) ? `${repDateParam}-01` : repDateParam
  }

  const fleetUnitIdNum = fleetUnitId ? Number(fleetUnitId) : null
  const latestPerComponent = searchParams.get('latestPerComponent') === '1'

  if (latestPerComponent) {
    if (!fleetUnitIdNum || Number.isNaN(fleetUnitIdNum)) {
      return NextResponse.json({ error: 'fleetUnitId is required' }, { status: 400 })
    }

    try {
      const result = await listLatestReplacementsByComponentPaginated(session, fleetUnitIdNum, pagination)

      return NextResponse.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load replacements'

      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const result = await listReplacementsPaginated(session, {
    fleetUnitId: fleetUnitIdNum,
    idMod: idMod ? Number(idMod) : null,
    woStatus,
    projectCode: searchParams.get('projectCode'),
    repDate: resolvedRepDate,
    search: parseListSearch(searchParams)
  }, pagination)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'replacements.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = replacementCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await createReplacement(session, parsed.data, Number(session.user.id) || undefined)

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create replacement'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
