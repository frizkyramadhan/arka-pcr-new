import { fetchEquipmentsRaw } from '@/lib/fleet-api/fetch'
import { invalidateFleetCache } from '@/lib/fleet-api/client'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { fleetUnitToCacheFields } from '@/lib/fleet-api/db-cache'
import { fleetModelFromEquipment, syncFleetModelCache } from '@/lib/fleet-api/model-cache'
import { prisma } from '@/lib/prisma'

export async function syncFleetUnitCache(): Promise<{
  synced: number
  modelsSynced: number
  skipped?: boolean
}> {
  if (!isFleetApiEnabled()) {
    console.log('[fleet-sync] Skipped — FLEET_API_ENABLED=false')
    const modelResult = await syncFleetModelCache()

    return { synced: 0, modelsSynced: modelResult.synced, skipped: true }
  }

  // One equipment fetch: models must exist before units (FK fleet_model_id).
  const equipments = await fetchEquipmentsRaw()
  const modelsById = new Map<number, ReturnType<typeof fleetModelFromEquipment>>()

  for (const eq of equipments) {
    if (eq.model_id > 0 && !modelsById.has(eq.model_id)) {
      modelsById.set(eq.model_id, fleetModelFromEquipment(eq))
    }
  }

  const models = Array.from(modelsById.values())
  const syncedAt = new Date()

  for (const model of models) {
    await prisma.fleetModelCache.upsert({
      where: { fleetModelId: model.fleetModelId },
      create: { ...model, syncedAt },
      update: {
        modelName: model.modelName,
        manufacture: model.manufacture,
        plantGroup: model.plantGroup,
        syncedAt
      }
    })
  }

  for (const eq of equipments) {
    if (!(eq.model_id > 0)) {
      console.warn(`[fleet-sync] skip unit ${eq.id} (${eq.unit_no}): missing model_id`)
      continue
    }

    const fields = fleetUnitToCacheFields(eq)

    await prisma.fleetUnitCache.upsert({
      where: { fleetUnitId: eq.id },
      create: fields,
      update: {
        ...fields,
        syncedAt: new Date()
      }
    })
  }

  invalidateFleetCache()

  return { synced: equipments.length, modelsSynced: models.length }
}

export const syncFleetEquipmentCache = syncFleetUnitCache
