import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

/**
 * Import pcr_forecast from legacy DB (when table exists in dump).
 * Historical CLOSED rows can be imported; OPEN rows require fleet cache + commod mapping.
 *
 * Usage: npm run migrate:import-forecasts
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!(await legacyTableExists(connection, 'pcr_forecast'))) {
    console.log('Legacy table `pcr_forecast` not found — skip or import via Excel in Phase 5 UI.')
    console.log('If legacy used spreadsheet-only workflow, use POST /api/imports/forecasts when added.')

    return
  }

  const mappings = await prisma.legacyUnitMapping.findMany()
  const mappingByLegacyId = new Map(mappings.map(row => [row.legacyUnitId, row.fleetUnitId]))
  const cacheRows = await prisma.fleetUnitCache.findMany()
  const cacheByFleetId = new Map(cacheRows.map(row => [row.fleetUnitId, row]))

  const legacyRows = await queryLegacyRows(
    connection,
    'SELECT id_forecast, id_unit, id_mod, plan_period, quarter, status, ba_pcr_status, remark FROM pcr_forecast ORDER BY id_forecast'
  )

  let imported = 0
  let skipped = 0

  for (const columns of legacyRows) {
    if (columns.length < 5) continue

    const legacyUnitId = Number(columns[1])
    const idMod = Number(columns[2])
    const fleetUnitId = mappingByLegacyId.get(legacyUnitId)

    if (!fleetUnitId || !cacheByFleetId.has(fleetUnitId)) {
      skipped += 1
      continue
    }

    const equipment = cacheByFleetId.get(fleetUnitId)!
    const commod = await prisma.commod.findUnique({ where: { idMod }, include: { comp: true } })

    if (!commod) {
      skipped += 1
      continue
    }

    const exists = await prisma.pcrForecast.findFirst({
      where: { fleetUnitId, idMod, planPeriod: new Date(columns[3]), deletedAt: null }
    })

    if (exists) {
      skipped += 1
      continue
    }

    await prisma.pcrForecast.create({
      data: {
        fleetUnitId,
        idMod,
        modelName: equipment.modelName,
        unitNo: equipment.unitNo,
        projectCode: equipment.projectCode,
        compDesc: commod.comp.compDesc,
        hmComponent: 0,
        lifePercent: 0,
        planPeriod: new Date(columns[3]),
        quarter: columns[4] || 'Q1',
        forecastStatus: columns[5] || 'OPEN',
        remark: columns[7] || null,
        source: 'LEGACY'
      }
    })

    const baStatus = columns[6] || 'PENDING'
    if (baStatus !== 'PENDING') {
      const created = await prisma.pcrForecast.findFirst({
        where: { fleetUnitId, idMod, planPeriod: new Date(columns[3]), deletedAt: null },
        orderBy: { idForecast: 'desc' }
      })
      if (created) {
        await prisma.baPcr.create({
          data: {
            idForecast: created.idForecast,
            baPcrStatus: baStatus
          }
        })
      }
    }

    imported += 1
  }

  console.log(`Forecast migration finished: imported=${imported}, skipped=${skipped}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
