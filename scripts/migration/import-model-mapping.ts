import fs from 'fs'
import path from 'path'

import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'

type MappingRow = {
  legacyModelId: number
  fleetModelId: number
  legacyModelNo?: string
  legacyManufacture?: string
}

function parseCsv(content: string): MappingRow[] {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const legacyIdIdx = headers.findIndex(h => h.includes('legacy_model_id') || h === 'id_model')
  const fleetIdIdx = headers.findIndex(h => h.includes('fleet_model_id'))
  const modelNoIdx = headers.findIndex(h => h.includes('model_name') || h.includes('model_no'))
  const manufactureIdx = headers.findIndex(h => h.includes('legacy_manufacture') || h === 'manufacture')

  if (legacyIdIdx === -1 || fleetIdIdx === -1) {
    throw new Error('CSV must have legacy_model_id and fleet_model_id columns')
  }

  const rows: MappingRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map(c => c.trim())
    if (!cols[legacyIdIdx] || !cols[fleetIdIdx]) continue

    rows.push({
      legacyModelId: Number(cols[legacyIdIdx]),
      fleetModelId: Number(cols[fleetIdIdx]),
      legacyModelNo: modelNoIdx >= 0 ? cols[modelNoIdx] : undefined,
      legacyManufacture: manufactureIdx >= 0 ? cols[manufactureIdx] : undefined
    })
  }

  return rows
}

/**
 * Import legacy_model_mapping from model-mapping.csv.
 * Usage: npm run migrate:model-mapping
 */
async function main() {
  const csvPath = path.resolve(migrationConfig.modelMappingCsv)

  if (!fs.existsSync(csvPath)) {
    console.error(`Mapping CSV not found: ${csvPath}`)
    console.error('Run npm run migrate:generate-mappings first.')
    process.exit(1)
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'))
  let imported = 0

  for (const row of rows) {
    if (!row.legacyModelId || !row.fleetModelId) continue

    await prisma.fleetModelCache.upsert({
      where: { fleetModelId: row.fleetModelId },
      create: {
        fleetModelId: row.fleetModelId,
        modelName: row.legacyModelNo ?? `Model ${row.fleetModelId}`
      },
      update: {}
    })

    await prisma.legacyModelMapping.upsert({
      where: { legacyModelId: row.legacyModelId },
      create: {
        legacyModelId: row.legacyModelId,
        fleetModelId: row.fleetModelId,
        legacyModelNo: row.legacyModelNo ?? null,
        legacyManufacture: row.legacyManufacture ?? null
      },
      update: {
        fleetModelId: row.fleetModelId,
        legacyModelNo: row.legacyModelNo ?? null,
        legacyManufacture: row.legacyManufacture ?? null
      }
    })

    imported += 1
  }

  console.log(`Imported ${imported} legacy model mapping row(s)`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
