import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { pingFleetApi } from '@/lib/fleet-api/fetch'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const fleet = await pingFleetApi()

  return NextResponse.json({
    fleet,
    projectsApiUrl: process.env.PROJECTS_API_URL ?? process.env.FLEET_API_URL ?? null,
    unitsApiUrl: process.env.ARK_FLEET_UNITS_URL ?? process.env.FLEET_API_URL ?? null,
    fleetApiEnabled: isFleetApiEnabled(),
    user: {
      projectCodes: session.user.projectCodes
    }
  })
}
