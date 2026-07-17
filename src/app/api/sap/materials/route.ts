import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isSapB1Enabled, searchMaterials } from '@/lib/sap-b1/client'
import { SapB1DisabledError } from '@/lib/sap-b1/config'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { DEFAULT_LIMIT, MAX_LIMIT, MIN_QUERY_LENGTH } from '@/lib/sap-b1/items-service'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (!isSapB1Enabled()) {
    return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: [] }, { status: 503 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limitRaw = Number(request.nextUrl.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), MAX_LIMIT) : DEFAULT_LIMIT

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({
      data: [],
      source: 'sap-b1',
      message: `Type at least ${MIN_QUERY_LENGTH} characters to search`
    })
  }

  try {
    const result = await searchMaterials({ query: q, limit })

    return NextResponse.json(result, {
      headers: {
        'X-Sap-Source': 'sap-b1',
        'X-Sap-Enabled': String(isSapB1Enabled())
      }
    })
  } catch (error) {
    if (error instanceof SapB1DisabledError) {
      return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: [] }, { status: 503 })
    }

    return NextResponse.json(
      {
        error: toFriendlySapErrorMessage(error, 'Failed to search SAP materials.'),
        data: []
      },
      { status: 502 }
    )
  }
}
