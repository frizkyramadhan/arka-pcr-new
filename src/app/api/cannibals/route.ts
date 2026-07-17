import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createCannibalRecord, listCannibalRecordsPaginated } from '@/lib/cannibal/service'
import { parseCannibalListFilters } from '@/lib/cannibal/list-filters'
import { cannibalCreateSchema } from '@/lib/validations/cannibal'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.access')
  if (forbidden) return forbidden

  const { searchParams } = request.nextUrl
  const pagination = parseListPagination(searchParams)
  const parsedFilters = parseCannibalListFilters(searchParams)

  const result = await listCannibalRecordsPaginated(session, parsedFilters, pagination)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'cannibals.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = cannibalCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const row = await createCannibalRecord(session, parsed.data, Number(session.user.id) || undefined)

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create BA'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
