import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  FleetApiDisabledError,
  FleetApiUnavailableError,
  isFleetApiEnabled
} from '@/lib/fleet-api/config'

export function fleetDisabledResponse() {
  return NextResponse.json(
    {
      error: 'Fleet API is disabled',
      hint: 'Set FLEET_API_ENABLED=true and configure PROJECTS_API_URL + ARK_FLEET_UNITS_URL when ark-fleet is reachable'
    },
    { status: 503 }
  )
}

export function fleetUnavailableResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Fleet API unavailable'

  return NextResponse.json({ error: message }, { status: 503 })
}

export async function withFleetApi<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  if (!isFleetApiEnabled()) {
    return fleetDisabledResponse()
  }

  try {
    return await handler()
  } catch (error) {
    if (error instanceof FleetApiDisabledError) {
      return fleetDisabledResponse()
    }

    if (error instanceof FleetApiUnavailableError) {
      return fleetUnavailableResponse(error)
    }

    throw error
  }
}

export function emptyFleetListResponse() {
  return NextResponse.json([])
}

/** Use in App Router handlers that need session + optional fleet data. */
export type FleetRouteContext = {
  request: NextRequest
}
