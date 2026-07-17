const LEGACY_FLEET_API_BASE = process.env.FLEET_API_URL ?? 'http://192.168.32.15/ark-fleet/api'

export const FLEET_PROJECTS_API_URL = process.env.PROJECTS_API_URL ?? `${LEGACY_FLEET_API_BASE}/projects`

export const FLEET_UNITS_API_URL = process.env.ARK_FLEET_UNITS_URL ?? `${LEGACY_FLEET_API_BASE}/equipments`

/** Set `FLEET_API_ENABLED=false` to develop without ark-fleet connectivity. */
export function isFleetApiEnabled(): boolean {
  const flag = process.env.FLEET_API_ENABLED

  if (flag === undefined || flag === '') return true

  return !['false', '0', 'no', 'off'].includes(flag.toLowerCase())
}

export class FleetApiDisabledError extends Error {
  constructor() {
    super('Fleet API is disabled (FLEET_API_ENABLED=false)')
    this.name = 'FleetApiDisabledError'
  }
}

export class FleetApiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FleetApiUnavailableError'
  }
}
