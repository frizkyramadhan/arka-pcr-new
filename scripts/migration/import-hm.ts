import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

import { migrationConfig } from './config'
import { legacyTableExists, parseMysqlUrl, queryLegacyRowsById } from './lib/mysql-cli'

const BATCH_SIZE = 500
const PAGE_SIZE = 20000

function invalidDate(value: string): boolean {
  return !value || value.startsWith('0000') || Number.isNaN(new Date(value).getTime())
}

/**
 * Import `hm` rows from legacy staging DB into Prisma target DB (paginated + batched).
 * Requires: legacy SQL imported, legacy_unit_mapping populated, fleet_equipment_cache synced.
 *
 * Usage: npm run migrate:import-hm
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!legacyTableExists(connection, 'hm')) {
    console.error('Legacy table `hm` not found. Run migrate:import-legacy-sql first.')
    process.exit(1)
  }

  const mappings = await prisma.legacyUnitMapping.findMany()
  const mappingByLegacyId = new Map(mappings.map(row => [row.legacyUnitId, row.fleetUnitId]))

  if (mappingByLegacyId.size === 0) {
    console.warn('Warning: legacy_unit_mapping is empty. Rows without mapping will be skipped.')
  }

  const cacheRows = await prisma.fleetUnitCache.findMany({
    select: { fleetUnitId: true, unitNo: true, projectCode: true }
  })
  const cacheByFleetId = new Map(cacheRows.map(row => [row.fleetUnitId, row]))

  let imported = 0
  let skipped = 0
  const seenKeys = new Set<string>()
  let batch: Prisma.HmCreateManyInput[] = []

  async function flushBatch() {
    if (batch.length === 0) return
    const result = await prisma.hm.createMany({ data: batch, skipDuplicates: true })
    imported += result.count
    batch = []
  }

  for (const page of queryLegacyRowsById(
    connection,
    'hm',
    'id_hm',
    'id_hm, id_unit, hm_unit, wh_day, date_hm',
    PAGE_SIZE
  )) {
    for (const columns of page) {
      if (columns.length < 5) continue

      const legacyUnitId = Number(columns[1])
      const dateHm = columns[4]

      if (invalidDate(dateHm)) {
        skipped += 1
        continue
      }

      const fleetUnitId = mappingByLegacyId.get(legacyUnitId)
      if (!fleetUnitId) {
        skipped += 1
        continue
      }

      const equipment = cacheByFleetId.get(fleetUnitId)
      if (!equipment) {
        skipped += 1
        continue
      }

      const hmUnit = Number(columns[2]) || 0
      const dedupeKey = `${fleetUnitId}:${dateHm}:${hmUnit}`
      if (seenKeys.has(dedupeKey)) {
        skipped += 1
        continue
      }
      seenKeys.add(dedupeKey)

      batch.push({
        fleetUnitId,
        hmUnit,
        whDay: Number(columns[3]) || 0,
        dateHm: new Date(dateHm),
        unitNo: equipment.unitNo,
        projectCode: equipment.projectCode
      })

      if (batch.length >= BATCH_SIZE) {
        await flushBatch()
      }
    }

    await flushBatch()
    console.log(`  … ${imported} HM rows inserted (skipped ${skipped})`)
  }

  console.log(`HM migration finished: imported=${imported}, skipped=${skipped}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
