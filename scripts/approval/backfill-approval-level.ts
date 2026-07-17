/**
 * Backfill baris approval untuk level baru pada dokumen in-flight.
 *
 * Usage:
 *   npx tsx scripts/approval/backfill-approval-level.ts --chain=CANNIBAL --level=NEWLV
 *   npx tsx scripts/approval/backfill-approval-level.ts --chain=PCR_FORECAST --level=NEWLV --dry-run
 *
 * Prasyarat:
 * 1. Level sudah ditambahkan di lib/approval/registry.ts
 * 2. Permission RBAC sudah di-seed (jalankan seed permissions / migrate)
 * 3. Kode level max 5 karakter (kolom DB VarChar(5))
 */
import type { ApprovalChainId } from '@/lib/approval/registry'
import { APPROVAL_CHAINS, getChainById, getChainLevelOrder } from '@/lib/approval/registry'
import { prisma } from '@/lib/prisma'

type CliArgs = {
  chain: ApprovalChainId
  level: string
  dryRun: boolean
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  let chain: ApprovalChainId | null = null
  let level: string | null = null
  let dryRun = false

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true
    else if (arg.startsWith('--chain=')) chain = arg.replace('--chain=', '') as ApprovalChainId
    else if (arg.startsWith('--level=')) level = arg.replace('--level=', '').trim()
  }

  if (!chain || !(chain in APPROVAL_CHAINS)) {
    throw new Error(`--chain wajib: ${Object.keys(APPROVAL_CHAINS).join(' | ')}`)
  }

  if (!level || level.length > 5) {
    throw new Error('--level wajib (max 5 karakter)')
  }

  const chainConfig = getChainById(chain)
  if (!chainConfig.levels.some(item => item.level === level)) {
    throw new Error(`Level "${level}" belum ada di registry chain ${chain}`)
  }

  return { chain, level, dryRun }
}

async function backfillPcrForecastLevel(level: string, dryRun: boolean) {
  const inFlight = await prisma.baPcr.findMany({
    where: {
      baPcrStatus: { in: ['SUBMITTED', 'IN_REVIEW'] },
      isActive: true
    },
    select: {
      idBaPcr: true,
      approvals: { select: { level: true } }
    }
  })

  let created = 0

  for (const baPcr of inFlight) {
    const exists = baPcr.approvals.some(row => row.level === level)
    if (exists) continue

    const chainLevel = getChainById('PCR_FORECAST').levels.find(item => item.level === level)
    if (!chainLevel) continue

    if (dryRun) {
      console.log(`[dry-run] Would create pcr_forecast_approval: baPcr=${baPcr.idBaPcr} level=${level}`)
    } else {
      await prisma.pcrForecastApproval.create({
        data: {
          idBaPcr: baPcr.idBaPcr,
          level,
          stepOrder: chainLevel.stepOrder ?? 1,
          approverLabel: chainLevel.label,
          status: 'PENDING'
        }
      })
    }

    created += 1
  }

  return { scanned: inFlight.length, created }
}

async function backfillCannibalLevel(level: string, dryRun: boolean) {
  const inFlight = await prisma.ba.findMany({
    where: {
      deletedAt: null,
      statusBa: { in: ['SUBMITTED', 'OPEN'] }
    },
    select: {
      idBa: true,
      approvals: { select: { level: true } }
    }
  })

  let created = 0

  for (const ba of inFlight) {
    const exists = ba.approvals.some(row => row.level === level)
    if (exists) continue

    if (dryRun) {
      console.log(`[dry-run] Would create ba_approval: ba=${ba.idBa} level=${level}`)
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

  return { scanned: inFlight.length, created }
}

async function main() {
  const { chain, level, dryRun } = parseArgs()
  const order = getChainLevelOrder(getChainById(chain))

  console.log(`Backfill approval level "${level}" for chain ${chain}`)
  console.log(`Current order: ${order.join(' → ')}`)
  if (dryRun) console.log('DRY RUN — tidak ada perubahan DB')

  const result =
    chain === 'PCR_FORECAST'
      ? await backfillPcrForecastLevel(level, dryRun)
      : await backfillCannibalLevel(level, dryRun)

  console.log('Done:', result)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
