/**
 * Hapus baris approval PENDING orphan pada BA OPEN tanpa level PS
 * (akibat backfill/ensure yang sempat membuat OGM/PGM/PD tanpa rantai lengkap).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/approval/cleanup-orphan-cannibal-approvals.ts
 */
import { prisma } from '@/lib/prisma'

const NEW_LEVELS = ['PS', 'PM', 'OGM', 'PGM', 'OD', 'PD', 'PLM'] as const

async function main() {
  const openBas = await prisma.ba.findMany({
    where: { deletedAt: null, statusBa: 'OPEN' },
    select: {
      idBa: true,
      approvals: { select: { idBaApproval: true, level: true, status: true } }
    }
  })

  let orphanChainsCleared = 0
  let rowsDeleted = 0

  for (const ba of openBas) {
    const hasPs = ba.approvals.some(row => row.level === 'PS')
    if (hasPs) continue

    const newRows = ba.approvals.filter(row =>
      (NEW_LEVELS as readonly string[]).includes(row.level)
    )
    if (!newRows.length) continue

    const allPending = newRows.every(row => row.status === 'PENDING')
    if (!allPending) continue

    await prisma.baApproval.deleteMany({
      where: { idBaApproval: { in: newRows.map(row => row.idBaApproval) } }
    })

    orphanChainsCleared += 1
    rowsDeleted += newRows.length
  }

  console.log({ openBas: openBas.length, orphanChainsCleared, rowsDeleted })
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
