import fs from 'fs'
import path from 'path'

import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'

type MappingRow = {
  legacyUnitId: number
  fleetUnitId: number
  legacyUnitNo?: string
}

function parseCsv(content: string): MappingRow[] {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const legacyIdIdx = headers.findIndex(h => h.includes('legacy_unit_id') || h === 'old_unit_id')
  const fleetIdIdx = headers.findIndex(h => h.includes('fleet_equipment_id') || h === 'fleet_id')
  const unitNoIdx = headers.findIndex(h => h.includes('legacy_unit_no') || h === 'unit_no')

  if (legacyIdIdx === -1 || fleetIdIdx === -1) {
    throw new Error('CSV must have legacy_unit_id and fleet_equipment_id columns')
  }

  const rows: MappingRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map(c => c.trim())
    if (!cols[legacyIdIdx] || !cols[fleetIdIdx]) continue

    rows.push({
      legacyUnitId: Number(cols[legacyIdIdx]),
      fleetUnitId: Number(cols[fleetIdIdx]),
      legacyUnitNo: unitNoIdx >= 0 ? cols[unitNoIdx] : undefined
    })
  }

  return rows
}

/**
 * Import legacy_unit_mapping from CSV (no Fleet API required).
 * Template: data/migration/unit-mapping.csv
 *
 * Usage: npm run migrate:unit-mapping
 */
async function main() {
  const csvPath = path.resolve(migrationConfig.unitMappingCsv)

  if (!fs.existsSync(csvPath)) {
    console.error(`Mapping CSV not found: ${csvPath}`)
    console.error('Create CSV with columns: legacy_unit_id,fleet_equipment_id,legacy_unit_no')
    process.exit(1)
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'))
  let imported = 0

  for (const row of rows) {
    await prisma.legacyUnitMapping.upsert({
      where: { legacyUnitId: row.legacyUnitId },
      create: {
        legacyUnitId: row.legacyUnitId,
        fleetUnitId: row.fleetUnitId,
        legacyUnitNo: row.legacyUnitNo ?? null
      },
      update: {
        fleetUnitId: row.fleetUnitId,
        legacyUnitNo: row.legacyUnitNo ?? null
      }
    })
    imported += 1
  }

  console.log(`Imported ${imported} legacy unit mapping row(s)`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
