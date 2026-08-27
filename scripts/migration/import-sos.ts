import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { loadCommodRemap, resolveModId } from './lib/commod-remap'
import { legacyTableExists, parseMysqlUrl, queryLegacyRowsById } from './lib/mysql-cli'

/**
 * Import SOS records from legacy staging DB.
 * Usage: npm run migrate:import-sos
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!(await legacyTableExists(connection, 'sos'))) {
    console.error('Legacy table `sos` not found. Run migrate:import-legacy-sql first.')
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
    'sos',
    'id_sos',
    "id_sos, id_unit, id_mod, type, IFNULL(DATE_FORMAT(sample_date, '%Y-%m-%d'), ''), lab_name, lab_no, oil_type, h_oil, h_unit, eval_code, recommendation, oil_change, oil_added",
    1000
  )) {
  for (const columns of page) {
    if (columns.length < 4) continue

    const legacyUnitId = Number(columns[1])
    const idMod = resolveModId(Number(columns[2]), commodRemap)
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

    const sampleRaw = columns[4]
    if (!sampleRaw || sampleRaw.startsWith('0000')) {
      skipped += 1
      continue
    }

    const sampleDate = new Date(sampleRaw)

    const exists = await prisma.sos.findFirst({
      where: { fleetUnitId, idMod, sampleDate, deletedAt: null }
    })

    if (exists) {
      skipped += 1
      continue
    }

    const oilChangeRaw = String(columns[12] ?? '').toLowerCase()

    const oilChange =
      oilChangeRaw === '1' ||
      oilChangeRaw === 'true' ||
      oilChangeRaw === 'yes'

    const oilAddedRaw = columns[13]

    const oilAddedParsed =
      oilAddedRaw === null || oilAddedRaw === undefined || oilAddedRaw === ''
        ? null
        : Number(oilAddedRaw)
    const oilAdded = oilAddedParsed != null && !Number.isNaN(oilAddedParsed) ? oilAddedParsed : null

    await prisma.sos.create({
      data: {
        fleetUnitId,
        idMod,
        type: columns[3] ? String(columns[3]).trim() : 'SOS',
        sampleDate,
        labName: columns[5] || null,
        labNo: columns[6] || null,
        oilType: columns[7] || null,
        hOil: columns[8] ? Number(columns[8]) : null,
        hUnit: columns[9] ? Number(columns[9]) : null,
        evalCode: columns[10] ? String(columns[10]).slice(0, 5) : null,
        recommendation: columns[11] ? String(columns[11]) : null,
        oilChange,
        oilAdded,
        unitNo: equipment.unitNo,
        projectCode: equipment.projectCode
      }
    })

    imported += 1
  }
    console.log(`sos progress: imported=${imported}, skipped=${skipped}`)
  }

  console.log(`SOS migration finished: imported=${imported}, skipped=${skipped}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
