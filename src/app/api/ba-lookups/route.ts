import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getBaLookups } from '@/lib/cannibal/service'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const lookups = await getBaLookups()

  return NextResponse.json(lookups)
}
