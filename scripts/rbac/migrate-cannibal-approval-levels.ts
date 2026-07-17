/**
 * Migrate cannibal ba_approval rows from legacy L1/L2/L3 to PS/PM/PLM/OGM/OD workflow.
 */
import { prisma } from '@/lib/prisma'
import { BA_APPROVAL_LEVELS } from '@/lib/cannibal/types'

const LEGACY_TO_NEW: Record<string, string> = {
  L1: 'PLM',
  L2: 'OGM',
  L3: 'OD'
}

export async function migrateCannibalApprovalLevels(): Promise<{
  remapped: number
  reseeded: number
}> {
  let remapped = 0

  const legacyRows = await prisma.baApproval.findMany({
    where: { level: { in: ['L1', 'L2', 'L3'] } }
  })

  for (const row of legacyRows) {
    const newLevel = LEGACY_TO_NEW[row.level]
    if (!newLevel) continue

    const conflict = await prisma.baApproval.findUnique({
      where: { idBa_level: { idBa: row.idBa, level: newLevel } }
    })

    if (conflict) {
      await prisma.baApproval.delete({ where: { idBaApproval: row.idBaApproval } })
    } else {
      await prisma.baApproval.update({
        where: { idBaApproval: row.idBaApproval },
        data: { level: newLevel }
      })
    }
    remapped += 1
  }

  const inFlightBas = await prisma.ba.findMany({
    where: {
      deletedAt: null,
      statusBa: { in: ['SUBMITTED', 'OPEN'] }
    },
    select: { idBa: true, approvals: { select: { level: true } } }
  })

  let reseeded = 0

  for (const ba of inFlightBas) {
    const existing = new Set(ba.approvals.map(item => item.level))
    const hasNewLevels = BA_APPROVAL_LEVELS.some(level => existing.has(level))

    if (hasNewLevels) continue

    for (const level of BA_APPROVAL_LEVELS) {
      await prisma.baApproval.upsert({
        where: { idBa_level: { idBa: ba.idBa, level } },
        create: { idBa: ba.idBa, level, status: 'PENDING' },
        update: {}
      })
    }
    reseeded += 1
  }

  return { remapped, reseeded }
}

async function main() {
  const result = await migrateCannibalApprovalLevels()
  console.log('Cannibal approval migration complete:', result)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

