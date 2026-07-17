import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listUnitsForSession } from '@/lib/fleet-api/equipment-service'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { requireSession } from '@/lib/utils/api-auth'
import { isHeadOffice } from '@/lib/utils/project-scope'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const projectCode = searchParams.get('projectCode')

  const { items, source } = await listUnitsForSession(session, {
    projectCode: isHeadOffice(session) ? projectCode : null,
    status,
    search
  })

  return NextResponse.json(items, {
    headers: {
      'X-Fleet-Source': source,
      'X-Fleet-Enabled': String(isFleetApiEnabled())
    }
  })
}
