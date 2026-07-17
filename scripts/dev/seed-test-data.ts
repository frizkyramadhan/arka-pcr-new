import { PrismaClient } from '@prisma/client'

/**
 * Temporary test data for local HM / equipment flows (no Fleet API).
 * Usage: npm run dev:seed-test
 * Cleanup: npm run dev:cleanup-test
 */
const TEST_FLEET_ID_MIN = 9000
const TEST_FLEET_ID_MAX = 9999

const prisma = new PrismaClient()

const testEquipments = [
  {
    fleetUnitId: 9001,
    unitNo: 'TEST-DT-001',
    description: 'Test Dump Truck',
    projectCode: '000H',
    fleetModelId: 901,
    modelName: 'HD785-7',
    manufacture: 'Komatsu',
    unitStatus: 'ACTIVE'
  },
  {
    fleetUnitId: 9002,
    unitNo: 'TEST-EX-002',
    description: 'Test Excavator',
    projectCode: '000H',
    fleetModelId: 902,
    modelName: 'PC200-8',
    manufacture: 'Komatsu',
    unitStatus: 'ACTIVE'
  }
]

async function main() {
  for (const equipment of testEquipments) {
    await prisma.fleetUnitCache.upsert({
      where: { fleetUnitId: equipment.fleetUnitId },
      create: equipment,
      update: equipment
    })
  }

  const hmSamples = [
    { fleetUnitId: 9001, hmUnit: 12000, whDay: 8, dateHm: new Date('2026-01-10'), unitNo: 'TEST-DT-001' },
    { fleetUnitId: 9001, hmUnit: 12150.5, whDay: 7, dateHm: new Date('2026-01-20'), unitNo: 'TEST-DT-001' },
    { fleetUnitId: 9002, hmUnit: 8500, whDay: 9, dateHm: new Date('2026-01-15'), unitNo: 'TEST-EX-002' }
  ]

  for (const sample of hmSamples) {
    const exists = await prisma.hm.findFirst({
      where: {
        fleetUnitId: sample.fleetUnitId,
        dateHm: sample.dateHm,
        deletedAt: null
      }
    })

    if (exists) continue

    await prisma.hm.create({
      data: {
        fleetUnitId: sample.fleetUnitId,
        hmUnit: sample.hmUnit,
        whDay: sample.whDay,
        dateHm: sample.dateHm,
        unitNo: sample.unitNo,
        projectCode: '000H'
      }
    })
  }

  console.log('Test data seeded (fleet IDs 9001-9002, sample HM records).')
  console.log('Run npm run dev:cleanup-test when finished testing.')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export { TEST_FLEET_ID_MIN, TEST_FLEET_ID_MAX }
