import type { FleetProject } from '@/types/fleet-api'

import { listAllCachedProjects } from '@/lib/fleet-api/db-cache'
import { fetchProjectsRaw } from '@/lib/fleet-api/fetch'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'

/**
 * Full project list for user-management dropdowns.
 * Proxies PROJECTS_API_URL when fleet API is enabled; falls back to local cache.
 */
export async function listProjectsForUserAdmin(): Promise<{
  items: FleetProject[]
  source: 'projects-api' | 'cache'
}> {
  if (isFleetApiEnabled()) {
    try {
      const items = await fetchProjectsRaw()

      return { items, source: 'projects-api' }
    } catch {
      return { items: await listAllCachedProjects(), source: 'cache' }
    }
  }

  return { items: await listAllCachedProjects(), source: 'cache' }
}
