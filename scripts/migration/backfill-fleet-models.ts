/**
 * Backfill fleet_model_cache, legacy_model_mapping, and re-align commod.id_model.
 * Usage: npm run migrate:backfill-models
 */
import { ensureFleetModelCacheRows, syncFleetModelCache } from '@/lib/fleet-api/model-cache'
import { syncFleetUnitCache } from '@/lib/fleet-api/sync-cache'
import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { execSync } from 'child_process'

async function countOrphanCommod(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt
    FROM commod c
    LEFT JOIN fleet_model_cache m ON m.fleet_model_id = c.id_model
    WHERE m.fleet_model_id IS NULL
  `

  return Number(rows[0]?.cnt ?? 0)
}

async function main() {
  console.log('Step 1/5 — Sync fleet unit + model cache from ARKFleet')
  const syncResult = await syncFleetUnitCache()
  console.log(`  Units synced: ${syncResult.synced}, models synced: ${syncResult.modelsSynced}`)

  if (syncResult.modelsSynced === 0) {
    const modelOnly = await syncFleetModelCache()
    console.log(`  Model cache fallback sync: ${modelOnly.synced}`)
  }

  console.log('Step 2/5 — Regenerate model-mapping.csv from legacy + fleet_model_cache')
  execSync('npm run migrate:generate-mappings', { stdio: 'inherit', cwd: process.cwd() })

  console.log('Step 3/5 — Import legacy_model_mapping table')
  execSync('npm run migrate:model-mapping', { stdio: 'inherit', cwd: process.cwd() })

  console.log('Step 4/5 — Re-import commod from legacy with fleet_model_id mapping')
  execSync('npm run migrate:import-commod', { stdio: 'inherit', cwd: process.cwd() })

  console.log('Step 5/5 — Verify fleet_model_cache coverage')

  const commodModelIds = await prisma.commod.findMany({
    distinct: ['fleetModelId'],
    select: { fleetModelId: true }
  })
  await ensureFleetModelCacheRows(commodModelIds.map(row => row.fleetModelId))

  const orphanCommod = await countOrphanCommod()
  const mappingCount = await prisma.legacyModelMapping.count()
  const modelCacheCount = await prisma.fleetModelCache.count()

  console.log('\nBackfill summary:')
  console.log(`  fleet_model_cache rows: ${modelCacheCount}`)
  console.log(`  legacy_model_mapping rows: ${mappingCount}`)
  console.log(`  commod orphan id_model (no cache row): ${orphanCommod}`)
  console.log(`  model-mapping.csv: ${migrationConfig.modelMappingCsv}`)

  if (orphanCommod > 0) {
    console.error('\nSome commod rows still reference missing fleet models. Review unmapped-models.csv')
    process.exit(1)
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
