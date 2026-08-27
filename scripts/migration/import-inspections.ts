import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { loadCommodRemap, resolveModId } from './lib/commod-remap'
import { parseLegacyDateOrDefault } from './lib/legacy-dates'
import { legacyTableExists, parseMysqlUrl, queryLegacyRowsById } from './lib/mysql-cli'

function normalizeRating(value: string | undefined): string {
  const r = String(value ?? 'A').trim().charAt(0).toUpperCase()
  if (r === 'A' || r === 'B' || r === 'C') return r

  return 'C'
}

/**
 * Import inspection records from legacy staging DB.
 * Usage: npm run migrate:import-inspections
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!(await legacyTableExists(connection, 'inspection'))) {
    console.error('Legacy table `inspection` not found. Run migrate:import-legacy-sql first.')
    process.exit(1)
  }

  const mappings = await prisma.legacyUnitMapping.findMany()
  const mappingByLegacyId = new Map(mappings.map(row => [row.legacyUnitId, row.fleetUnitId]))
  const cacheRows = await prisma.fleetUnitCache.findMany()
  const cacheByFleetId = new Map(cacheRows.map(row => [row.fleetUnitId, row]))

  const commodRemap = loadCommodRemap()

  let imported = 0
  let skipped = 0

  for await (const page of queryLegacyRowsById(
    connection,
    'inspection',
    'id_ins',
    "id_ins, id_unit, id_mod, IFNULL(DATE_FORMAT(ins_date, '%Y-%m-%d'), ''), ins_hm, rating, type",
    1000
  )) {
  for (const columns of page) {
    if (columns.length < 7) continue

    const legacyUnitId = Number(columns[1])
    const idMod = resolveModId(Number(columns[2]), commodRemap)
    const insDate = parseLegacyDateOrDefault(columns[3])
    const type = String(columns[6] ?? '').trim().toUpperCase().slice(0, 10)
    if (!type) {
      skipped += 1
      continue
    }
    const fleetUnitId = mappingByLegacyId.get(legacyUnitId)

    if (!fleetUnitId || !cacheByFleetId.has(fleetUnitId)) {
      skipped += 1
      continue
    }

    const equipment = cacheByFleetId.get(fleetUnitId)!
    const commod = await prisma.commod.findUnique({ where: { idMod } })

    if (!commod) {
      skipped += 1
      continue
    }

    const exists = await prisma.inspection.findFirst({
      where: { fleetUnitId, idMod, type, insDate, deletedAt: null }
    })

    if (exists) {
      skipped += 1
      continue
    }

    await prisma.inspection.create({
      data: {
        fleetUnitId,
        idMod,
        type,
        insDate,
        insHm: columns[4] ? Number(columns[4]) : null,
        rating: normalizeRating(columns[5]),
        unitNo: equipment.unitNo,
        projectCode: equipment.projectCode
      }
    })

    imported += 1
  }
    console.log(`inspection progress: imported=${imported}, skipped=${skipped}`)
  }

  console.log(`Inspection import done: ${imported} imported, ${skipped} skipped.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
