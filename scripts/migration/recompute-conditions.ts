import { prisma } from '@/lib/prisma'
import { recomputeConditionsForEquipment } from '@/lib/condition/service'

/**
 * Recompute condition rows from latest SOS + inspection history.
 * Usage: npm run migrate:recompute-conditions
 */
async function main() {
  const equipmentRows = await prisma.fleetUnitCache.findMany({
    select: { fleetUnitId: true, unitNo: true }
  })

  let total = 0

  for (const equipment of equipmentRows) {
    const rows = await recomputeConditionsForEquipment(equipment.fleetUnitId)
    total += rows.length
    console.log(`${equipment.unitNo} (${equipment.fleetUnitId}): ${rows.length} condition row(s)`)
  }

  console.log(`\nRecompute done: ${total} condition row(s) across ${equipmentRows.length} equipment.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
