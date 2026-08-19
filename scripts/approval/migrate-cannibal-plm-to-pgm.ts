/**
 * Rename cannibal approval level PLM → PGM and adopt order OGM → PGM.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/approval/migrate-cannibal-plm-to-pgm.ts
 *   npx tsx --env-file=.env.local scripts/approval/migrate-cannibal-plm-to-pgm.ts --dry-run
 *
 * Steps:
 * 1. Rename ba_approval.level PLM → PGM (skip/delete on conflict)
 * 2. If PGM APPROVED while OGM not APPROVED (old order), reset PGM → PENDING
 * 3. Ensure in-flight BA punya baris OGM & PGM
 */
import { prisma } from '@/lib/prisma'

const dryRun = process.argv.includes('--dry-run')

async function renamePlmToPgm() {
  // PCR forecast uses pcr_forecast_approval — semua PLM di ba_approval = cannibal.
  const plmRows = await prisma.baApproval.findMany({
    where: { level: 'PLM' }
  })

  let renamed = 0
  let deletedConflicts = 0

  for (const row of plmRows) {
    const conflict = await prisma.baApproval.findUnique({
      where: { idBa_level: { idBa: row.idBa, level: 'PGM' } }
    })

    if (conflict) {
      if (dryRun) {
        console.log(`[dry-run] Delete conflicting PLM row id=${row.idBaApproval} (PGM already exists for ba=${row.idBa})`)
      } else {
        await prisma.baApproval.delete({ where: { idBaApproval: row.idBaApproval } })
      }
      deletedConflicts += 1
      continue
    }

    if (dryRun) {
      console.log(`[dry-run] Rename PLM→PGM idBaApproval=${row.idBaApproval} ba=${row.idBa}`)
    } else {
      await prisma.baApproval.update({
        where: { idBaApproval: row.idBaApproval },
        data: { level: 'PGM' }
      })
    }
    renamed += 1
  }

  return { scanned: plmRows.length, renamed, deletedConflicts }
}

/** Old chain: … → PLM → OGM → …  New: … → OGM → PGM → … */
async function fixOrderConsistency() {
  const inFlight = await prisma.ba.findMany({
    where: {
      deletedAt: null,
      statusBa: { in: ['SUBMITTED', 'OPEN'] }
    },
    select: {
      idBa: true,
      approvals: {
        where: { level: { in: ['OGM', 'PGM', 'OD', 'PD'] } },
        select: {
          idBaApproval: true,
          level: true,
          status: true
        }
      }
    }
  })

  let resetPgm = 0
  let resetLater = 0

  for (const ba of inFlight) {
    const byLevel = new Map(ba.approvals.map(row => [row.level, row]))
    const ogm = byLevel.get('OGM')
    const pgm = byLevel.get('PGM')

    if (!pgm || pgm.status !== 'APPROVED') continue
    if (ogm?.status === 'APPROVED') continue

    // PGM already approved before OGM — invalid under new order
    if (dryRun) {
      console.log(`[dry-run] Reset PGM→PENDING ba=${ba.idBa}`)
    } else {
      await prisma.baApproval.update({
        where: { idBaApproval: pgm.idBaApproval },
        data: { status: 'PENDING', approvedBy: null, approvedAt: null, remark: null }
      })
    }
    resetPgm += 1

    for (const level of ['OD', 'PD'] as const) {
      const row = byLevel.get(level)
      if (!row || row.status === 'PENDING') continue

      if (dryRun) {
        console.log(`[dry-run] Reset ${level}→PENDING ba=${ba.idBa}`)
      } else {
        await prisma.baApproval.update({
          where: { idBaApproval: row.idBaApproval },
          data: { status: 'PENDING', approvedBy: null, approvedAt: null, remark: null }
        })
      }
      resetLater += 1
    }
  }

  return { scanned: inFlight.length, resetPgm, resetLater }
}

/** Hanya BA yang sudah punya rantai baru (ada PS) — jangan seed OGM/PGM ke legacy OPEN kosong. */
async function ensureOgmPgmRows() {
  const inFlight = await prisma.ba.findMany({
    where: {
      deletedAt: null,
      statusBa: { in: ['SUBMITTED', 'OPEN'] },
      approvals: { some: { level: 'PS' } }
    },
    select: {
      idBa: true,
      approvals: { select: { level: true } }
    }
  })

  let created = 0

  for (const ba of inFlight) {
    const existing = new Set(ba.approvals.map(row => row.level))

    for (const level of ['OGM', 'PGM'] as const) {
      if (existing.has(level)) continue

      if (dryRun) {
        console.log(`[dry-run] Create ${level} PENDING ba=${ba.idBa}`)
      } else {
        await prisma.baApproval.create({
          data: {
            idBa: ba.idBa,
            level,
            status: 'PENDING',
            documentType: 'CANNIBAL'
          }
        })
      }
      created += 1
    }
  }

  return { scanned: inFlight.length, created }
}

async function main() {
  console.log(`Migrate cannibal PLM → PGM (order OGM → PGM)${dryRun ? ' [DRY RUN]' : ''}`)

  const rename = await renamePlmToPgm()
  console.log('Rename PLM→PGM:', rename)

  const consistency = await fixOrderConsistency()
  console.log('Order consistency:', consistency)

  const ensure = await ensureOgmPgmRows()
  console.log('Ensure OGM/PGM rows:', ensure)

  console.log('Done.')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
