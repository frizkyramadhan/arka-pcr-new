import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { parseLegacyDateOrDefault } from './lib/legacy-dates'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

/**
 * Import kanibal lines from legacy staging DB.
 * Usage: npm run migrate:import-kanibal
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!legacyTableExists(connection, 'kanibal')) {
    console.error('Legacy table `kanibal` not found. Run migrate:import-legacy-sql first.')
    process.exit(1)
  }

  const mappings = await prisma.legacyUnitMapping.findMany()
  const mappingByLegacyId = new Map(mappings.map(row => [row.legacyUnitId, row.fleetUnitId]))
  const cacheRows = await prisma.fleetUnitCache.findMany()
  const cacheByFleetId = new Map(cacheRows.map(row => [row.fleetUnitId, row]))
  const baRows = await prisma.ba.findMany({ select: { noBa: true } })
  const baSet = new Set(baRows.map(row => row.noBa))

  const legacyRows = queryLegacyRows(
    connection,
    'SELECT id_kanibal, no_ba, id_rep, id_unit, date, comp_desc, pn, sn, pos, hm_comp, wo_no_kanibal, wo_status_kanibal, type FROM kanibal ORDER BY id_kanibal'
  )

  let imported = 0
  let skipped = 0

  for (const columns of legacyRows) {
    if (columns.length < 6) continue

    const noBa = String(columns[1] ?? '').trim()
    if (!noBa || !baSet.has(noBa)) {
      skipped += 1
      continue
    }

    const legacyUnitId = Number(columns[3])
    const fleetUnitId = mappingByLegacyId.get(legacyUnitId)

    if (!fleetUnitId || !cacheByFleetId.has(fleetUnitId)) {
      skipped += 1
      continue
    }

    const equipment = cacheByFleetId.get(fleetUnitId)!
    const legacyIdRep = Number(columns[2])
    const idRep = legacyIdRep > 0 ? legacyIdRep : null
    const compDesc = String(columns[5] ?? '').trim()
    const lineDate = parseLegacyDateOrDefault(columns[4])

    const exists = await prisma.kanibal.findFirst({
      where: { noBa, fleetUnitId, type: String(columns[12] ?? 'REMOVE'), compDesc, date: lineDate }
    })

    if (exists) {
      skipped += 1
      continue
    }

    await prisma.kanibal.create({
      data: {
        noBa,
        idRep,
        fleetUnitId,
        date: lineDate,
        compDesc,
        pn: columns[6] ?? '',
        sn: columns[7] ?? '',
        pos: columns[8] ?? '',
        hmComp: columns[9] ? Number(columns[9]) : 0,
        woNoKanibal: columns[10] ? String(columns[10]) : null,
        woStatusKanibal: columns[11] ? String(columns[11]) : 'OPEN',
        type: String(columns[12] ?? 'REMOVE').toUpperCase(),
        unitNo: equipment.unitNo
      }
    })

    imported += 1
  }

  console.log(`Kanibal import done: ${imported} imported, ${skipped} skipped.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
