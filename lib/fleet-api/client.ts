import {
  fetchEquipmentsRaw,
  fetchProjectsRaw,
  getEquipmentByIdRaw,
  getEquipmentsByProjectRaw
} from '@/lib/fleet-api/fetch'
import type { FleetProject, FleetUnit } from '@/types/fleet-api'

export { pingFleetApi } from '@/lib/fleet-api/fetch'

export { isFleetApiEnabled } from '@/lib/fleet-api/config'

const CACHE_TTL_MS = 10 * 60 * 1000

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

let projectsCache: CacheEntry<FleetProject[]> | null = null
let equipmentsCache: CacheEntry<FleetUnit[]> | null = null

async function getCachedProjects(): Promise<FleetProject[]> {
  if (projectsCache && projectsCache.expiresAt > Date.now()) {
    return projectsCache.data
  }

  const data = await fetchProjectsRaw()
  projectsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS }

  return data
}

async function getCachedEquipments(): Promise<FleetUnit[]> {
  if (equipmentsCache && equipmentsCache.expiresAt > Date.now()) {
    return equipmentsCache.data
  }

  const data = await fetchEquipmentsRaw()
  equipmentsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS }

  return data
}

export async function getProjects(): Promise<FleetProject[]> {
  return getCachedProjects()
}

export async function getEquipments(): Promise<FleetUnit[]> {
  return getCachedEquipments()
}

export async function getEquipmentsByProject(projectCode: string): Promise<FleetUnit[]> {
  const all = await getCachedEquipments()

  if (projectCode === '000H') return all

  return all.filter((e: FleetUnit) => e.project_code === projectCode)
}

export async function getEquipmentById(id: number): Promise<FleetUnit | null> {
  const all = await getCachedEquipments()

  return all.find((e: FleetUnit) => e.id === id) ?? null
}

export async function getUniqueModels(): Promise<
  Array<{
    model_id: number
    model: string
    manufacture: string
    plant_group: string
  }>
> {
  const equipments = await getCachedEquipments()
  const map = new Map<number, FleetUnit>()

  for (const eq of equipments) {
    if (!map.has(eq.model_id)) map.set(eq.model_id, eq)
  }

  return Array.from(map.values()).map(e => ({
    model_id: e.model_id,
    model: e.model,
    manufacture: e.manufacture,
    plant_group: e.plant_group
  }))
}

export function invalidateFleetCache() {
  projectsCache = null
  equipmentsCache = null
}

// Re-export raw helpers for scripts outside Next.js runtime.
export { getEquipmentsByProjectRaw, getEquipmentByIdRaw }
