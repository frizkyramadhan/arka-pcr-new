import { fetchEquipmentsRaw } from '@/lib/fleet-api/fetch'
import { invalidateFleetCache } from '@/lib/fleet-api/client'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { fleetUnitToCacheFields } from '@/lib/fleet-api/db-cache'
import { syncFleetModelCache } from '@/lib/fleet-api/model-cache'
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

  const modelResult = await syncFleetModelCache()
  const equipments = await fetchEquipmentsRaw()

  for (const eq of equipments) {
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

  return { synced: equipments.length, modelsSynced: modelResult.synced }
}

export const syncFleetEquipmentCache = syncFleetUnitCache
