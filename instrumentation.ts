export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  startCannibalSlaExpireTick()
  startFleetSyncIfEnabled()
}

function startCannibalSlaExpireTick() {
  const intervalMs = 15 * 60 * 1000

  const runExpire = async () => {
    try {
      const { expireOverdueCannibalBas } = await import('@/lib/cannibal/expire')
      const expired = await expireOverdueCannibalBas()
      if (expired > 0) {
        console.log(`[cannibal-sla] Expired ${expired} BA(s)`)
      }
    } catch (error) {
      console.error('[cannibal-sla] Expire tick failed:', error)
    }
  }

  setTimeout(runExpire, 45_000)
  setInterval(runExpire, intervalMs)
}

function startFleetSyncIfEnabled() {
  const fleetEnabled = process.env.FLEET_API_ENABLED
  const disabled =
    fleetEnabled !== undefined &&
    fleetEnabled !== '' &&
    ['false', '0', 'no', 'off'].includes(fleetEnabled.toLowerCase())

  if (disabled) {
    console.log('[fleet-sync] Auto sync disabled — FLEET_API_ENABLED=false')

    return
  }

  const intervalMs = 10 * 60 * 1000

  const runSync = async () => {
    try {
      const { syncFleetEquipmentCache } = await import('@/lib/fleet-api/sync-cache')
      const result = await syncFleetEquipmentCache()

      if (!result.skipped) {
        console.log(`[fleet-sync] Updated ${result.synced} equipment records`)
      }
    } catch (error) {
      console.error('[fleet-sync] Failed:', error)
    }
  }

  setTimeout(runSync, 30_000)
  setInterval(runSync, intervalMs)
}
