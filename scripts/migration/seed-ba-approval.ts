import { prisma } from '@/lib/prisma'

/**
 * Seed ba_approval rows from flat legacy columns on `ba`.
 * Run after BA data is migrated into the new schema.
 *
 * Usage: npm run migrate:seed-ba-approval
 */
async function main() {
  const bas = await prisma.ba.findMany({
    where: { deletedAt: null },
    select: {
      idBa: true,
      statusL1: true,
      statusL2: true,
      statusL3: true,
      userL1: true,
      userL2: true,
      userL3: true
    }
  })

  let seeded = 0

  for (const ba of bas) {
    const levels = [
      { level: 'L1', status: ba.statusL1, user: ba.userL1 },
      { level: 'L2', status: ba.statusL2, user: ba.userL2 },
      { level: 'L3', status: ba.statusL3, user: ba.userL3 }
    ] as const

    for (const item of levels) {
      if (!item.status || item.status === 'PENDING') continue

      await prisma.baApproval.upsert({
        where: { idBa_level: { idBa: ba.idBa, level: item.level } },
        create: {
          idBa: ba.idBa,
          level: item.level,
          status: item.status === 'APPROVED' ? 'APPROVED' : item.status,
          approvedBy: null,
          approvedAt: new Date()
        },
        update: {
          status: item.status === 'APPROVED' ? 'APPROVED' : item.status,
          approvedBy: null,
          approvedAt: new Date()
        }
      })
      seeded += 1
    }
  }

  console.log(`Seeded ${seeded} ba_approval row(s) from legacy flat columns`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
