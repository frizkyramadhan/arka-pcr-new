import fs from 'fs'
import path from 'path'

import { prisma } from '@/lib/prisma'
import { ensureFleetModelCacheRows } from '@/lib/fleet-api/model-cache'

import { migrationConfig } from './config'
import { saveCommodRemap } from './lib/commod-remap'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

async function loadModelMapping(): Promise<Map<number, number>> {
  const map = new Map<number, number>()

  const csvPath = path.resolve(migrationConfig.modelMappingCsv)
  if (fs.existsSync(csvPath)) {
    const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean)
    for (let i = 1; i < lines.length; i += 1) {
      const [legacyId, fleetId] = lines[i].split(',')
      const legacyModelId = Number(legacyId)
      const fleetModelId = Number(fleetId)
      if (legacyModelId > 0 && fleetModelId > 0) map.set(legacyModelId, fleetModelId)
    }
  }

  const dbRows = await prisma.legacyModelMapping.findMany()
  for (const row of dbRows) {
    if (!map.has(row.legacyModelId)) map.set(row.legacyModelId, row.fleetModelId)
  }

  return map
}

/**
 * Import commod from legacy (preserve id_mod where unique; remap duplicates on fleet_model+comp).
 * Usage: npm run migrate:import-commod
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)
  const modelMap = await loadModelMapping()

  if (modelMap.size === 0) {
    console.error('Model mapping CSV empty. Run migrate:generate-mappings first.')
    process.exit(1)
  }

  if (!(await legacyTableExists(connection, 'commod'))) {
    console.error('Legacy table `commod` not found.')
    process.exit(1)
  }

  const rows = await queryLegacyRows(
    connection,
    'SELECT id_mod, id_model, id_comp, policy, price FROM commod ORDER BY id_mod'
  )

  const pairToCanonical = new Map<string, number>()
  const idRemap: Record<string, number> = {}
  let imported = 0
  let remapped = 0
  let skipped = 0

  for (const cols of rows) {
    if (cols.length < 4) continue

    const idMod = Number(cols[0])
    const legacyModelId = Number(cols[1])
    const idComp = Number(cols[2])
    const fleetModelId = modelMap.get(legacyModelId)

    if (!fleetModelId) {
      skipped += 1
      continue
    }

    await ensureFleetModelCacheRows([fleetModelId])

    let comp = await prisma.comp.findUnique({ where: { idComp } })
    if (!comp) {
      await prisma.comp.create({
        data: {
          idComp,
          compDesc: `LEGACY-COMP-${idComp}`,
          status: 'Inactive'
        }
      })
      comp = await prisma.comp.findUnique({ where: { idComp } })
    }
    if (!comp) {
      skipped += 1
      continue
    }

    const pairKey = `${fleetModelId}:${idComp}`
    const canonicalId = pairToCanonical.get(pairKey)

    if (canonicalId !== undefined && canonicalId !== idMod) {
      idRemap[String(idMod)] = canonicalId
      remapped += 1
      continue
    }

    const priceRaw = cols[4]

    const price =
      priceRaw !== null && priceRaw !== undefined && priceRaw !== '' && Number(priceRaw) > 0
        ? Number(priceRaw)
        : null

    try {
      await prisma.commod.upsert({
        where: { idMod },
        create: {
          idMod,
          fleetModelId,
          idComp,
          policy: cols[3] ? Number(cols[3]) : null,
          price
        },
        update: {
          fleetModelId,
          idComp,
          policy: cols[3] ? Number(cols[3]) : null,
          price
        }
      })
      pairToCanonical.set(pairKey, idMod)
      imported += 1
    } catch (error) {
      const existing = await prisma.commod.findFirst({
        where: { fleetModelId, idComp }
      })

      if (existing) {
        idRemap[String(idMod)] = existing.idMod
        pairToCanonical.set(pairKey, existing.idMod)
        remapped += 1
      } else {
        throw error
      }
    }
  }

  saveCommodRemap(idRemap)

  console.log(
    `Commod import done: ${imported} imported, ${remapped} remapped to canonical id_mod, ${skipped} skipped`
  )
  console.log(`Remap file: ${path.join(migrationConfig.dataDir, 'commod-id-remap.json')}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
