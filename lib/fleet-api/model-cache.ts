/**
 * Fleet model cache — sync ARKFleet models into fleet_model_cache (master for commod.id_model).
 */
import { fetchEquipmentsRaw } from '@/lib/fleet-api/fetch'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { prisma } from '@/lib/prisma'

export type FleetModelSnapshot = {
  fleetModelId: number
  modelName: string | null
  manufacture: string | null
  plantGroup: string | null
}

export function fleetModelFromEquipment(eq: {
  model_id: number
  model: string
  manufacture: string
  plant_group: string
}): FleetModelSnapshot {
  return {
    fleetModelId: eq.model_id,
    modelName: eq.model || null,
    manufacture: eq.manufacture || null,
    plantGroup: eq.plant_group || null
  }
}

/** Distinct models from fleet_equipment_cache when Fleet API is unavailable. */
export async function deriveModelsFromUnitCache(): Promise<FleetModelSnapshot[]> {
  const rows = await prisma.fleetUnitCache.findMany({
    select: {
      fleetModelId: true,
      modelName: true,
      manufacture: true,
      plantGroup: true
    },
    distinct: ['fleetModelId'],
    orderBy: { fleetModelId: 'asc' }
  })

  return rows.map(row => ({
    fleetModelId: row.fleetModelId,
    modelName: row.modelName,
    manufacture: row.manufacture,
    plantGroup: row.plantGroup
  }))
}

async function fetchModelsFromFleetApi(): Promise<FleetModelSnapshot[]> {
  const equipments = await fetchEquipmentsRaw()
  const map = new Map<number, FleetModelSnapshot>()

  for (const eq of equipments) {
    if (!map.has(eq.model_id)) {
      map.set(eq.model_id, fleetModelFromEquipment(eq))
    }
  }

  return Array.from(map.values())
}

export async function resolveFleetModelSnapshots(): Promise<FleetModelSnapshot[]> {
  if (isFleetApiEnabled()) {
    try {
      return await fetchModelsFromFleetApi()
    } catch {
      return deriveModelsFromUnitCache()
    }
  }

  return deriveModelsFromUnitCache()
}

export async function syncFleetModelCache(): Promise<{ synced: number; skipped?: boolean }> {
  if (!isFleetApiEnabled()) {
    const models = await deriveModelsFromUnitCache()

    if (models.length === 0) {
      console.log('[fleet-model-sync] Skipped — no models in unit cache')

      return { synced: 0, skipped: true }
    }

    await upsertFleetModels(models)

    return { synced: models.length }
  }

  const models = await resolveFleetModelSnapshots()
  await upsertFleetModels(models)

  return { synced: models.length }
}

async function upsertFleetModels(models: FleetModelSnapshot[]) {
  const syncedAt = new Date()

  for (const model of models) {
    await prisma.fleetModelCache.upsert({
      where: { fleetModelId: model.fleetModelId },
      create: {
        fleetModelId: model.fleetModelId,
        modelName: model.modelName,
        manufacture: model.manufacture,
        plantGroup: model.plantGroup,
        syncedAt
      },
      update: {
        modelName: model.modelName,
        manufacture: model.manufacture,
        plantGroup: model.plantGroup,
        syncedAt
      }
    })
  }
}

/** Ensure fleet_model_cache rows exist for all referenced model ids (units + commod). */
export async function ensureFleetModelCacheRows(modelIds: number[]) {
  const uniqueIds = [...new Set(modelIds.filter(id => Number.isFinite(id) && id > 0))]
  if (uniqueIds.length === 0) return

  const existing = await prisma.fleetModelCache.findMany({
    where: { fleetModelId: { in: uniqueIds } },
    select: { fleetModelId: true }
  })
  const existingSet = new Set(existing.map(row => row.fleetModelId))
  const missing = uniqueIds.filter(id => !existingSet.has(id))

  for (const fleetModelId of missing) {
    const unit = await prisma.fleetUnitCache.findFirst({
      where: { fleetModelId },
      select: { modelName: true, manufacture: true, plantGroup: true }
    })

    await prisma.fleetModelCache.create({
      data: {
        fleetModelId,
        modelName: unit?.modelName ?? `Model ${fleetModelId}`,
        manufacture: unit?.manufacture ?? null,
        plantGroup: unit?.plantGroup ?? null
      }
    })
  }
}
