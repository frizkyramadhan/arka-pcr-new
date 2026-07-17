import { syncFleetUnitCache } from '@/lib/fleet-api/sync-cache'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'

async function main() {
  if (!isFleetApiEnabled()) {
    console.log('Fleet sync skipped — set FLEET_API_ENABLED=true in .env.local')
    process.exit(0)
  }

  const result = await syncFleetUnitCache()

  if (result.skipped) {
    console.log('Fleet sync skipped')
  } else {
    console.log(`Synced ${result.synced} equipment records to fleet_equipment_cache`)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
