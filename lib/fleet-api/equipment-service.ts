import type { Session } from 'next-auth'

import {
  getCachedUnit,
  listAllCachedProjects,
  listCachedUnits,
  listCachedUnitsForSession,
  listCachedModels,
  listCachedProjects
} from '@/lib/fleet-api/db-cache'
import { getProjects, getUniqueModels } from '@/lib/fleet-api/client'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { canAccessProject, getSessionProjectCodes, hasAllProjectsAccess } from '@/lib/utils/project-scope'
import type { FleetProject, FleetUnit } from '@/types/fleet-api'
import { matchesUnitStatus } from '@/lib/fleet-api/unit-status'
import { paginateListIfRequested, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'

export type UnitListFilters = {
  projectCode?: string | null
  status?: string | null
  search?: string | null
  unitNo?: string | null
  model?: string | null
  project?: string | null
  manufacture?: string | null
  plantGroup?: string | null
}

export type UnitListQuery = UnitListFilters & {
  sortField:
    | 'unit_no'
    | 'description'
    | 'project_code'
    | 'model'
    | 'manufacture'
    | 'plant_group'
    | 'plant_type'
    | 'unitstatus'
  sortOrder: 'asc' | 'desc'
  pagination?: { page: number; pageSize: number }
}

const UNIT_SORT_FIELDS = [
  'unit_no',
  'description',
  'project_code',
  'model',
  'manufacture',
  'plant_group',
  'plant_type',
  'unitstatus'
] as const

function includesTextFilter(value: string | null | undefined, query: string | null | undefined) {
  if (!query?.trim()) return true

  return String(value ?? '')
    .toLowerCase()
    .includes(query.trim().toLowerCase())
}

export function parseUnitListQuery(searchParams: URLSearchParams): UnitListQuery {
  const sortFieldRaw = searchParams.get('column') ?? searchParams.get('sortField') ?? 'unit_no'

  const sortField = UNIT_SORT_FIELDS.includes(sortFieldRaw as (typeof UNIT_SORT_FIELDS)[number])
    ? (sortFieldRaw as UnitListQuery['sortField'])
    : 'unit_no'

  const sortOrderRaw = searchParams.get('sort') ?? searchParams.get('sortOrder') ?? 'asc'
  
return {
    projectCode: searchParams.get('projectCode'),
    status: searchParams.get('status'),
    search: searchParams.get('search') ?? searchParams.get('q'),
    unitNo: searchParams.get('unitNo'),
    model: searchParams.get('model'),
    project: searchParams.get('project'),
    manufacture: searchParams.get('manufacture'),
    plantGroup: searchParams.get('plantGroup'),
    sortField,
    sortOrder: sortOrderRaw === 'desc' ? 'desc' : 'asc',
    pagination: parseOptionalPageFromSearchParams(searchParams)
  }
}

export function sortUnits(
  units: FleetUnit[],
  field: UnitListQuery['sortField'],
  order: 'asc' | 'desc'
): FleetUnit[] {
  const direction = order === 'asc' ? 1 : -1

  return [...units].sort((a, b) => {
    const left = String(a[field] ?? '').toLowerCase()
    const right = String(b[field] ?? '').toLowerCase()

    if (left < right) return -1 * direction
    if (left > right) return 1 * direction

    return 0
  })
}

export function applyUnitFilters(
  units: FleetUnit[],
  filters: UnitListFilters
): FleetUnit[] {
  let result = units

  if (filters.projectCode) {
    result = result.filter(item => item.project_code === filters.projectCode)
  }

  if (filters.status) {
    result = result.filter(item => matchesUnitStatus(item.unitstatus, filters.status!))
  }

  if (filters.unitNo) {
    result = result.filter(item => includesTextFilter(item.unit_no, filters.unitNo))
  }

  if (filters.model) {
    result = result.filter(item => includesTextFilter(item.model, filters.model))
  }

  if (filters.project) {
    result = result.filter(item => includesTextFilter(item.project_code, filters.project))
  }

  if (filters.manufacture) {
    result = result.filter(item => includesTextFilter(item.manufacture, filters.manufacture))
  }

  if (filters.plantGroup) {
    result = result.filter(item => includesTextFilter(item.plant_group, filters.plantGroup))
  }

  if (filters.search) {
    const query = filters.search.toLowerCase()
    result = result.filter(
      item =>
        item.unit_no.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query) ||
        item.manufacture.toLowerCase().includes(query) ||
        item.project_code.toLowerCase().includes(query) ||
        item.plant_group.toLowerCase().includes(query) ||
        item.plant_type.toLowerCase().includes(query)
    )
  }

  return result
}

export async function listUnitsForSession(
  session: Session,
  filters: UnitListFilters = {}
): Promise<{ items: FleetUnit[]; source: 'cache' }> {
  const items = applyUnitFilters(await listCachedUnitsForSession(session), filters)

  return { items, source: 'cache' }
}

export async function listUnitsQuery(
  session: Session,
  query: UnitListQuery
): Promise<{ total: number; data: FleetUnit[]; source: 'cache' }> {
  const { items, source } = await listUnitsForSession(session, query)
  const sorted = sortUnits(items, query.sortField, query.sortOrder)
  
return {
    ...paginateListIfRequested(sorted, query.pagination),
    source
  }
}

/** Units for one project — no user project-scope filter (cannibal REMOVE/INSTALL). */
export async function listUnitsByProjectUnscoped(
  query: UnitListQuery
): Promise<{ total: number; data: FleetUnit[]; source: 'cache' }> {
  const items = applyUnitFilters(await listCachedUnits(), {
    projectCode: query.projectCode,
    status: query.status,
    search: query.search,
    unitNo: query.unitNo,
    model: query.model,
    project: query.project,
    manufacture: query.manufacture,
    plantGroup: query.plantGroup
  })
  const sorted = sortUnits(items, query.sortField, query.sortOrder)

  // Picker REMOVE/INSTALL needs every unit in the project — ignore list pageSize cap (100).
  return {
    total: sorted.length,
    data: sorted,
    source: 'cache'
  }
}

/** All fleet projects including those outside the user's assigned scope. */
export async function listAllProjectsUnscoped(): Promise<FleetProject[]> {
  if (isFleetApiEnabled()) {
    try {
      return await getProjects()
    } catch {
      return listAllCachedProjects()
    }
  }

  return listAllCachedProjects()
}

/** Single unit from fleet_equipment_cache (no live ARKFleet call). */
export async function getUnitForSession(
  session: Session,
  fleetId: number
): Promise<FleetUnit | null> {
  const unit = await getCachedUnit(fleetId)
  if (!unit) return null

  if (!canAccessProject(session, unit.project_code)) {
    return null
  }

  return unit
}

export async function listProjectsForSession(session: Session): Promise<FleetProject[]> {
  if (isFleetApiEnabled()) {
    try {
      const projects = await getProjects()

      if (!hasAllProjectsAccess(session)) {
        const allowed = new Set(getSessionProjectCodes(session))

        return projects.filter(project => allowed.has(project.project_code))
      }

      return projects
    } catch {
      return listCachedProjects(session)
    }
  }

  return listCachedProjects(session)
}

// Backward-compatible aliases for existing API route imports.
export const applyEquipmentFilters = applyUnitFilters

export type EquipmentListFilters = UnitListFilters

export const listEquipmentsForSession = listUnitsForSession

export const getEquipmentForSession = getUnitForSession

export async function listModelsForSession(): Promise<
  Array<{
    model_id: number
    model: string
    manufacture: string
    plant_group: string
  }>
> {
  if (isFleetApiEnabled()) {
    try {
      return getUniqueModels()
    } catch {
      return listCachedModels()
    }
  }

  return listCachedModels()
}
