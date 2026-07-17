import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listUnitOptionsForSession } from '@/lib/fleet-api/unit-options'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')
  const limit = searchParams.get('limit')

  const rows = await listUnitOptionsForSession(session, {
    search,
    limit: limit ? Number(limit) : undefined
  })

  return NextResponse.json(rows)
}
