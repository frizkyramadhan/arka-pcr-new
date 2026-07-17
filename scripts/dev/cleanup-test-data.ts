import { PrismaClient } from '@prisma/client'

const TEST_FLEET_ID_MIN = 9000
const TEST_FLEET_ID_MAX = 9999
const LEGACY_DEMO_IDS = [1001, 1002, 1003]

/**
 * Remove temporary test/demo data from DB.
 * Usage: npm run dev:cleanup-test
 */
const prisma = new PrismaClient()

async function main() {
  const hmDeleted = await prisma.hm.deleteMany({
    where: {
      OR: [
        { fleetUnitId: { gte: TEST_FLEET_ID_MIN, lte: TEST_FLEET_ID_MAX } },
        { fleetUnitId: { in: LEGACY_DEMO_IDS } },
        { unitNo: { startsWith: 'TEST-' } }
      ]
    }
  })

  const cacheDeleted = await prisma.fleetUnitCache.deleteMany({
    where: {
      OR: [
        { fleetUnitId: { gte: TEST_FLEET_ID_MIN, lte: TEST_FLEET_ID_MAX } },
        { fleetUnitId: { in: LEGACY_DEMO_IDS } },
        { unitNo: { startsWith: 'TEST-' } }
      ]
    }
  })

  console.log(`Cleanup done: ${hmDeleted.count} HM row(s), ${cacheDeleted.count} cache row(s) removed.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
