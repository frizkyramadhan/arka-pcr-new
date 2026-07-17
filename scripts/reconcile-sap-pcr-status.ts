/**
 * Rekonsiliasi status WO/PO SAP B1 vs status Replacement di PCR — read-only, tidak menulis ke SAP.
 * Mendeteksi selisih (misal WO sudah Close/Cancel di SAP tapi Replacement.woStatus masih OPEN di PCR)
 * dan menyimpannya ke sap_reconciliation_log untuk ditinjau lewat halaman admin (/admin/sap-integration).
 *
 * Penjadwalan:
 * - Development (Windows): Task Scheduler, jalan harian (misal jam 02:00)
 *     Program: npx.cmd  Arguments: tsx --env-file=.env.local scripts/reconcile-sap-pcr-status.ts
 * - Production (Linux/Docker, cron) — crontab -e, tiap hari jam 02:00:
 *     0 2 * * * cd /app && npx tsx scripts/reconcile-sap-pcr-status.ts >> /var/log/sap-reconcile.log 2>&1
 *
 * Manual run: npm run sap:reconcile
 */
import { PrismaClient } from '@prisma/client'

import { getPurchaseOrder, getServiceCall, normalizeDocNumQuery } from '@/lib/sap-b1/documents-service'
import { isSapB1Enabled } from '@/lib/sap-b1/config'

const prisma = new PrismaClient()

const WO_CLOSED_LABELS = new Set(['Close', 'Cancel'])
const PO_CLOSED_LABELS = new Set(['Closed', 'Canceled'])

function toDocNum(raw: string | null): number | null {
  if (!raw) return null

  const normalized = normalizeDocNumQuery(raw)
  const num = Number(normalized)

  return normalized && Number.isFinite(num) ? num : null
}

async function hasOpenLog(idRep: number, entityType: string): Promise<boolean> {
  const existing = await prisma.sapReconciliationLog.findFirst({
    where: { idRep, entityType, resolvedAt: null }
  })

  return existing != null
}

async function checkWo(idRep: number, woNo: string, woStatus: string): Promise<boolean> {
  const docNum = toDocNum(woNo)
  if (docNum == null) return false

  const wo = await getServiceCall(docNum).catch(() => null)
  if (!wo || !WO_CLOSED_LABELS.has(wo.statusLabel)) return false

  if (await hasOpenLog(idRep, 'WO')) return false

  await prisma.sapReconciliationLog.create({
    data: {
      idRep,
      entityType: 'WO',
      sapDocNum: woNo,
      pcrStatus: woStatus,
      sapStatus: wo.statusLabel
    }
  })

  return true
}

async function checkPo(idRep: number, poNo: string, woStatus: string): Promise<boolean> {
  const docNum = toDocNum(poNo)
  if (docNum == null) return false

  const po = await getPurchaseOrder(docNum).catch(() => null)
  if (!po || !PO_CLOSED_LABELS.has(po.docStatusLabel)) return false

  if (await hasOpenLog(idRep, 'PO')) return false

  await prisma.sapReconciliationLog.create({
    data: {
      idRep,
      entityType: 'PO',
      sapDocNum: poNo,
      pcrStatus: woStatus,
      sapStatus: po.docStatusLabel
    }
  })

  return true
}

async function main(): Promise<void> {
  if (!isSapB1Enabled()) {
    console.log('SAP B1 disabled (SAP_B1_ENABLED=false) — skip reconciliation.')

    return
  }

  const candidates = await prisma.replacement.findMany({
    where: {
      deletedAt: null,
      woStatus: 'OPEN',
      OR: [{ woNo: { not: null } }, { poNo: { not: null } }]
    },
    select: { idRep: true, woNo: true, poNo: true, woStatus: true, unitNo: true }
  })

  let mismatchCount = 0
  let checked = 0

  for (const rep of candidates) {
    checked += 1

    try {
      if (rep.woNo && (await checkWo(rep.idRep, rep.woNo, rep.woStatus))) mismatchCount += 1
      if (rep.poNo && (await checkPo(rep.idRep, rep.poNo, rep.woStatus))) mismatchCount += 1
    } catch (error) {
      console.error(`Skip id_rep=${rep.idRep} (unit ${rep.unitNo}):`, error instanceof Error ? error.message : error)
    }
  }

  console.log(JSON.stringify({ checked, newMismatches: mismatchCount }, null, 2))
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
