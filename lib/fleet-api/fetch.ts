import type { FleetProject, FleetUnit } from '@/types/fleet-api'

import {
  FLEET_PROJECTS_API_URL,
  FLEET_UNITS_API_URL,
  FleetApiDisabledError,
  FleetApiUnavailableError,
  isFleetApiEnabled
} from '@/lib/fleet-api/config'

export { FLEET_PROJECTS_API_URL, FLEET_UNITS_API_URL, isFleetApiEnabled, FleetApiDisabledError, FleetApiUnavailableError }

async function fetchFleetFromUrl<T>(url: string): Promise<T> {
  if (!isFleetApiEnabled()) {
    throw new FleetApiDisabledError()
  }

  let res: Response

  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(Number(process.env.FLEET_API_TIMEOUT_MS) || 15_000)
    })
  } catch (error) {
    throw new FleetApiUnavailableError(error instanceof Error ? error.message : 'Fleet API request failed')
  }

  if (!res.ok) {
    throw new FleetApiUnavailableError(`Fleet API error: ${res.status} ${url}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new FleetApiUnavailableError(`Fleet API returned non-JSON response for ${url}`)
  }

  return res.json()
}

function unwrapList<T>(payload: T[] | { data?: T[] }): T[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data

  throw new FleetApiUnavailableError('Fleet API returned unexpected list payload')
}

export async function fetchProjectsRaw(): Promise<FleetProject[]> {
  const payload = await fetchFleetFromUrl<FleetProject[] | { data?: FleetProject[] }>(FLEET_PROJECTS_API_URL)

  return unwrapList(payload)
}

export async function fetchEquipmentsRaw(): Promise<FleetUnit[]> {
  const payload = await fetchFleetFromUrl<FleetUnit[] | { data?: FleetUnit[]; count?: number }>(FLEET_UNITS_API_URL)

  return unwrapList(payload)
}

export async function getEquipmentsByProjectRaw(projectCode: string): Promise<FleetUnit[]> {
  const all = await fetchEquipmentsRaw()

  if (projectCode === '000H') return all

  return all.filter(e => e.project_code === projectCode)
}

export async function getEquipmentByIdRaw(id: number): Promise<FleetUnit | null> {
  const all = await fetchEquipmentsRaw()

  return all.find(e => e.id === id) ?? null
}

export async function pingFleetApi(): Promise<{
  ok: boolean
  enabled: boolean
  projectCount?: number
  error?: string
}> {
  if (!isFleetApiEnabled()) {
    return { ok: false, enabled: false, error: 'Fleet API disabled via FLEET_API_ENABLED' }
  }

  try {
    const projects = await fetchProjectsRaw()

    return { ok: true, enabled: true, projectCount: projects.length }
  } catch (error) {
    return {
      ok: false,
      enabled: true,
      error: error instanceof Error ? error.message : 'Unknown Fleet API error'
    }
  }
}
