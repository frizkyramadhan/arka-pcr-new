import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { loadCommodRemap, resolveModId } from './lib/commod-remap'
import { parseLegacyDate, parseLegacyDateOrDefault } from './lib/legacy-dates'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

/**
 * Import replacement (PCR WO) from legacy staging DB.
 * Requires legacy_unit_mapping + fleet_equipment_cache.
 *
 * Usage: npm run migrate:import-replacements
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!legacyTableExists(connection, 'replacement')) {
    console.error('Legacy table `replacement` not found. Run migrate:import-legacy-sql first.')
    process.exit(1)
  }

  const mappings = await prisma.legacyUnitMapping.findMany()
  const mappingByLegacyId = new Map(mappings.map(row => [row.legacyUnitId, row.fleetUnitId]))
  const cacheRows = await prisma.fleetUnitCache.findMany()
  const cacheByFleetId = new Map(cacheRows.map(row => [row.fleetUnitId, row]))
  const commodRemap = loadCommodRemap()

  const legacyRows = queryLegacyRows(
    connection,
    'SELECT id_rep, id_unit, id_mod, rep_date, last_rep_date, hm_rep, last_hm_rep, wo_no, wo_date, wo_status, wo_end_date, comp_hour, comp_life, life_percent, comp_cond, remarks, report FROM replacement ORDER BY id_rep'
  )

  let imported = 0
  let skipped = 0

  for (const columns of legacyRows) {
    if (columns.length < 10) continue

    const idRep = Number(columns[0])
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

    const repDate = parseLegacyDateOrDefault(columns[3])
    const existing = await prisma.replacement.findUnique({ where: { idRep } })

    if (existing) {
      skipped += 1
      continue
    }

    const woNo = columns[7]
    const compCond = String(columns[14] ?? 'A').trim().charAt(0).toUpperCase() || 'A'

    await prisma.replacement.create({
      data: {
        idRep,
        repDate,
        lastRepDate: parseLegacyDate(columns[4]),
        fleetUnitId,
        idMod,
        hmRep: Number(columns[5]) || 0,
        lastHmRep: Number(columns[6]) || 0,
        woNo: woNo && Number(woNo) !== 0 ? String(woNo) : null,
        woDate: parseLegacyDate(columns[8]),
        woStatus: columns[9] === 'CLOSE' || columns[9] === 'CLOSED' ? 'CLOSE' : 'OPEN',
        woEndDate: parseLegacyDate(columns[10]),
        compHour: columns[11] ? Number(columns[11]) : null,
        compLife: Number(columns[12]) || 0,
        lifePercent: Number(columns[13]) || 0,
        compCond: compCond === '-' ? 'A' : compCond.slice(0, 1),
        remarks: columns[15] || '',
        report: columns[16] || null,
        unitNo: equipment.unitNo,
        projectCode: equipment.projectCode
      }
    })

    imported += 1
  }

  console.log(`Replacement migration finished: imported=${imported}, skipped=${skipped}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
