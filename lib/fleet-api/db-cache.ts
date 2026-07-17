import type { FleetUnit, FleetProject } from '@/types/fleet-api'
import type { Session } from 'next-auth'

import { prisma } from '@/lib/prisma'
import {
  filterByProject,
  getPrismaProjectFilter,
  getSessionProjectCodes,
  hasAllProjectsAccess
} from '@/lib/utils/project-scope'

type CacheRow = {
  fleetUnitId: number
  unitNo: string
  description: string | null
  projectCode: string
  fleetModelId: number
  modelName: string | null
  manufacture: string | null
  plantGroup: string | null
  plantType: string | null
  unitStatus: string | null
}

/** Map Fleet API unit payload → Prisma fleet_equipment_cache fields. */
export function fleetUnitToCacheFields(unit: FleetUnit) {
  return {
    fleetUnitId: unit.id,
    unitNo: unit.unit_no,
    description: unit.description,
    projectCode: unit.project_code,
    fleetModelId: unit.model_id,
    modelName: unit.model,
    manufacture: unit.manufacture,
    plantGroup: unit.plant_group || null,
    plantType: unit.plant_type || null,
    unitStatus: unit.unitstatus
  }
}

function mapCacheRow(row: CacheRow): FleetUnit {
  return {
    id: row.fleetUnitId,
    unit_no: row.unitNo,
    description: row.description ?? '',
    active_date: null,
    nomor_polisi: null,
    serial_no: null,
    chasis_no: null,
    engine_model: null,
    machine_no: null,
    bahan_bakar: null,
    warna: null,
    capacity: null,
    remarks: null,
    project_code: row.projectCode,
    project_id: 0,
    plant_group: row.plantGroup ?? '',
    plant_group_id: 0,
    model: row.modelName ?? '',
    model_id: row.fleetModelId,
    manufacture: row.manufacture ?? '',
    unitstatus: row.unitStatus ?? 'ACTIVE',
    unitstatus_id: 0,
    asset_category: '',
    asset_category_id: 0,
    plant_type: row.plantType ?? '',
    plant_type_id: 0
  }
}

export async function listCachedUnits(): Promise<FleetUnit[]> {
  const rows = await prisma.fleetUnitCache.findMany({
    orderBy: [{ projectCode: 'asc' }, { unitNo: 'asc' }]
  })

  return rows.map(mapCacheRow)
}

/** Units from fleet_equipment_cache scoped to the user's project access (SQL filter). */
export async function listCachedUnitsForSession(session: Session): Promise<FleetUnit[]> {
  const scope = getPrismaProjectFilter(session)

  if ('projectCode' in scope && scope.projectCode === '__NONE__') {
    return []
  }

  const rows = await prisma.fleetUnitCache.findMany({
    where: scope,
    orderBy: [{ projectCode: 'asc' }, { unitNo: 'asc' }]
  })

  return rows.map(mapCacheRow)
}

export async function getCachedUnit(fleetId: number): Promise<FleetUnit | null> {
  const row = await prisma.fleetUnitCache.findUnique({
    where: { fleetUnitId: fleetId }
  })

  return row ? mapCacheRow(row) : null
}

/** All distinct project codes from unit cache (no session scope). */
export async function listAllCachedProjects(): Promise<FleetProject[]> {
  const rows = await prisma.fleetUnitCache.findMany({
    select: { projectCode: true },
    distinct: ['projectCode'],
    orderBy: { projectCode: 'asc' }
  })

  return rows.map(row => ({
    project_code: row.projectCode,
    bowheer: row.projectCode,
    location: ''
  }))
}

export async function listCachedProjects(session: Session): Promise<FleetProject[]> {
  const projects = await listAllCachedProjects()

  if (!hasAllProjectsAccess(session)) {
    const allowed = new Set(getSessionProjectCodes(session))

    return projects.filter(project => allowed.has(project.project_code))
  }

  return projects
}

export async function listCachedModels(): Promise<
  Array<{
    model_id: number
    model: string
    manufacture: string
    plant_group: string
  }>
> {
  const rows = await prisma.fleetModelCache.findMany({
    orderBy: { modelName: 'asc' }
  })

  if (rows.length > 0) {
    return rows.map(row => ({
      model_id: row.fleetModelId,
      model: row.modelName ?? `Model ${row.fleetModelId}`,
      manufacture: row.manufacture ?? '',
      plant_group: row.plantGroup ?? ''
    }))
  }

  // Fallback when fleet_model_cache belum terisi (pre-migration)
  const unitRows = await prisma.fleetUnitCache.findMany({
    select: {
      fleetModelId: true,
      modelName: true,
      manufacture: true,
      plantGroup: true
    },
    distinct: ['fleetModelId'],
    orderBy: { modelName: 'asc' }
  })

  return unitRows.map(row => ({
    model_id: row.fleetModelId,
    model: row.modelName ?? `Model ${row.fleetModelId}`,
    manufacture: row.manufacture ?? '',
    plant_group: row.plantGroup ?? ''
  }))
}

export function scopeCachedUnits(equipments: FleetUnit[], session: Session): FleetUnit[] {
  return filterByProject(equipments, session)
}
