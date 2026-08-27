import fs from 'fs'
import path from 'path'

import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { normalizeModelKey, normalizeModelManufactureKey } from './lib/normalize-model-key'
import { normalizeUnitNo } from './lib/normalize-unit-no'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

type ModelMappingRow = {
  legacyModelId: number
  fleetModelId: number
  modelName: string
}

/**
 * Build unit-mapping.csv and model-mapping.csv from legacy DB + fleet caches.
 * Model mapping priority: (1) model_no ↔ fleet_model_cache name, (2) unit-derived, (3) unit-cache name.
 * Usage: npm run migrate:generate-mappings
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!(await legacyTableExists(connection, 'unit'))) {
    console.error('Legacy table `unit` not found. Run migrate:import-legacy-sql first.')
    process.exit(1)
  }

  const fleetRows = await prisma.fleetUnitCache.findMany({
    select: { fleetUnitId: true, unitNo: true, fleetModelId: true, modelName: true }
  })

  if (fleetRows.length === 0) {
    console.error('fleet_equipment_cache is empty. Run npm run fleet:sync first.')
    process.exit(1)
  }

  const fleetModels = await prisma.fleetModelCache.findMany({
    select: { fleetModelId: true, modelName: true, manufacture: true }
  })

  const fleetByModelName = new Map<string, number>()
  const fleetByNameManufacture = new Map<string, number>()

  for (const model of fleetModels) {
    const nameKey = normalizeModelKey(model.modelName)
    if (nameKey && !fleetByModelName.has(nameKey)) {
      fleetByModelName.set(nameKey, model.fleetModelId)
    }

    const compositeKey = normalizeModelManufactureKey(model.modelName, model.manufacture)
    if (compositeKey !== '|' && !fleetByNameManufacture.has(compositeKey)) {
      fleetByNameManufacture.set(compositeKey, model.fleetModelId)
    }
  }

  for (const row of fleetRows) {
    const nameKey = normalizeModelKey(row.modelName)
    if (nameKey && !fleetByModelName.has(nameKey)) {
      fleetByModelName.set(nameKey, row.fleetModelId)
    }
  }

  const fleetByUnitNo = new Map<string, (typeof fleetRows)[0]>()
  for (const row of fleetRows) {
    const key = normalizeUnitNo(row.unitNo)
    if (!key) continue
    if (!fleetByUnitNo.has(key)) fleetByUnitNo.set(key, row)
  }

  const legacyUnits = await queryLegacyRows(
    connection,
    'SELECT id_unit, unit_no, id_model FROM unit ORDER BY id_unit'
  )

  const unitLines = ['legacy_unit_id,fleet_equipment_id,legacy_unit_no']
  const unmappedUnits: string[] = []
  const modelFromUnits = new Map<number, number>()

  for (const cols of legacyUnits) {
    const legacyUnitId = Number(cols[0])
    const legacyUnitNo = String(cols[1] ?? '').trim()
    const legacyModelId = Number(cols[2])
    const fleet = fleetByUnitNo.get(normalizeUnitNo(legacyUnitNo))

    if (!fleet) {
      unmappedUnits.push(`${legacyUnitId},${legacyUnitNo}`)
      continue
    }

    unitLines.push(`${legacyUnitId},${fleet.fleetUnitId},${legacyUnitNo.replace(/,/g, ' ')}`)

    if (legacyModelId > 0 && fleet.fleetModelId > 0) {
      modelFromUnits.set(legacyModelId, fleet.fleetModelId)
    }
  }

  const legacyModels = (await legacyTableExists(connection, 'model'))
    ? await queryLegacyRows(
        connection,
        'SELECT id_model, model_no, manufacture FROM model ORDER BY id_model'
      )
    : []

  const modelLines = ['legacy_model_id,fleet_model_id,model_name']
  const mappedModels = new Map<number, ModelMappingRow>()
  const unmappedModels: string[] = []

  for (const cols of legacyModels) {
    const legacyModelId = Number(cols[0])
    const legacyModelNo = String(cols[1] ?? '').trim()
    const legacyManufacture = String(cols[2] ?? '').trim()
    const nameKey = normalizeModelKey(legacyModelNo)
    const compositeKey = normalizeModelManufactureKey(legacyModelNo, legacyManufacture)

    let fleetModelId = fleetByNameManufacture.get(compositeKey) ?? fleetByModelName.get(nameKey)

    if (fleetModelId) {
      mappedModels.set(legacyModelId, {
        legacyModelId,
        fleetModelId,
        modelName: legacyModelNo
      })
    }
  }

  for (const [legacyModelId, fleetModelId] of modelFromUnits) {
    if (mappedModels.has(legacyModelId)) continue

    mappedModels.set(legacyModelId, {
      legacyModelId,
      fleetModelId,
      modelName: ''
    })
  }

  for (const cols of legacyModels) {
    const legacyModelId = Number(cols[0])
    if (mappedModels.has(legacyModelId)) continue

    const modelNo = normalizeUnitNo(cols[1])
    const fleetModelId = fleetByModelName.get(normalizeModelKey(modelNo))
    if (!fleetModelId) {
      unmappedModels.push(`${legacyModelId},${cols[1]}`)
      continue
    }

    mappedModels.set(legacyModelId, {
      legacyModelId,
      fleetModelId,
      modelName: String(cols[1] ?? '')
    })
  }

  for (const row of mappedModels.values()) {
    modelLines.push(`${row.legacyModelId},${row.fleetModelId},${row.modelName.replace(/,/g, ' ')}`)
  }

  const dataDir = path.resolve(migrationConfig.dataDir)
  fs.mkdirSync(dataDir, { recursive: true })

  const unitPath = path.resolve(migrationConfig.unitMappingCsv)
  const modelPath = path.resolve(migrationConfig.modelMappingCsv)

  fs.writeFileSync(unitPath, `${unitLines.join('\n')}\n`, 'utf8')
  fs.writeFileSync(modelPath, `${modelLines.join('\n')}\n`, 'utf8')

  const unmappedPath = path.join(dataDir, 'unmapped-units.csv')
  if (unmappedUnits.length > 0) {
    fs.writeFileSync(unmappedPath, `legacy_unit_id,legacy_unit_no\n${unmappedUnits.join('\n')}\n`, 'utf8')
  }

  const unmappedModelPath = path.join(dataDir, 'unmapped-models.csv')
  if (unmappedModels.length > 0) {
    fs.writeFileSync(
      unmappedModelPath,
      `legacy_model_id,legacy_model_no\n${unmappedModels.join('\n')}\n`,
      'utf8'
    )
  }

  console.log(`Unit mapping: ${unitLines.length - 1} matched, ${unmappedUnits.length} unmapped → ${unitPath}`)
  console.log(`Model mapping: ${modelLines.length - 1} rows → ${modelPath}`)
  if (unmappedUnits.length > 0) console.log(`Unmapped units: ${unmappedPath}`)
  if (unmappedModels.length > 0) console.log(`Unmapped models: ${unmappedModelPath}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
