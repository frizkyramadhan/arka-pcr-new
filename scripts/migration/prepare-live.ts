import fs from 'fs'
import path from 'path'

import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { syncFleetUnitCache } from '@/lib/fleet-api/sync-cache'

import { migrationConfig } from './config'
import { legacyTableExists, parseMysqlUrl } from './lib/mysql-cli'

/**
 * Pre-flight checklist before live migration + fleet sync.
 * Usage: npm run migrate:prepare-live
 */
async function main() {
  console.log('ARKA PCR — Live migration pre-flight\n')

  const fleetEnabled = isFleetApiEnabled()
  console.log(`[${fleetEnabled ? 'OK' : '--'}] FLEET_API_ENABLED=${process.env.FLEET_API_ENABLED ?? 'true'}`)
  console.log(`[--] FLEET_API_URL=${process.env.FLEET_API_URL ?? '(default)'}`)

  const legacySql = path.resolve(migrationConfig.legacySqlPath)
  const hasSql = fs.existsSync(legacySql)
  console.log(`[${hasSql ? 'OK' : '--'}] Legacy SQL dump: ${legacySql}`)

  let legacyHasHm = false
  try {
    const legacyConn = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)
    legacyHasHm = await legacyTableExists(legacyConn, 'hm')
    console.log(`[${legacyHasHm ? 'OK' : '--'}] Legacy staging DB table hm`)
  } catch (error) {
    console.log('[--] Legacy staging DB unreachable')
  }

  const unitCsv = path.resolve(migrationConfig.unitMappingCsv)
  console.log(`[${fs.existsSync(unitCsv) ? 'OK' : '--'}] Unit mapping CSV: ${unitCsv}`)

  console.log('\nRecommended live sequence:')
  console.log('  1. Set FLEET_API_ENABLED=true in .env.local')
  console.log('  2. npm run fleet:sync')
  console.log('  3. Copy SQL → data/migration/legacy.sql')
  console.log('  4. npm run migrate:import-legacy-sql')
  console.log('  5. npm run migrate:audit-legacy')
  console.log('  6. npm run migrate:unit-mapping')
  console.log('  7. npm run migrate:import-hm   (and other table scripts as added)')
  console.log('  8. npm run migrate:import-inspections')
  console.log('  9. npm run migrate:recompute-conditions')
  console.log(' 10. npm run migrate:import-ba')
  console.log(' 11. npm run migrate:import-kanibal')
  console.log(' 12. npm run migrate:seed-ba-approval')
  console.log(' 13. npm run migrate:passwords')

  if (fleetEnabled) {
    console.log('\nAttempting fleet cache sync…')
    try {
      const result = await syncFleetUnitCache()
      console.log(`Fleet sync: ${result.skipped ? 'skipped' : `${result.synced} equipment(s) cached`}`)
    } catch (error) {
      console.error('Fleet sync failed:', error instanceof Error ? error.message : error)
      console.error('Check network access to ark-fleet before running data migration.')
    }
  } else {
    console.log('\nFleet sync skipped — enable FLEET_API_ENABLED when API is reachable.')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
