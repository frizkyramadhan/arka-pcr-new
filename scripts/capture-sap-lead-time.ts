/**
 * AI #8 — Capture histori lead-time procurement (PR→PO, +MI best-effort) dari SAP B1 untuk
 * Replacement yang sudah punya prNo & poNo terisi, simpan sample baru ke sap_lead_time_sample.
 * Read-only terhadap SAP (tidak menulis balik). Skip Replacement yang sudah pernah dicatat
 * (unique constraint idRep) — cukup jalan berkala, sample lama tidak diulang.
 *
 * Sumber tanggal:
 * - prDate/poDate: DocDate dari PurchaseRequests/PurchaseOrders (lib/sap-b1/documents-service.ts).
 * - miDate: best-effort dari kandidat DeliveryNotes terkait WO (getMisForWo) — null bila tidak ketemu,
 *   tidak menggagalkan sample (leadTimeDays dihitung dari PR→PO saja, sesuai desain rencana AI #8).
 *
 * Penjadwalan:
 * - Development (Windows): Task Scheduler, jalan mingguan
 *     Program: npx.cmd  Arguments: tsx --env-file=.env.local scripts/capture-sap-lead-time.ts
 * - Production (Linux/Docker, cron) — crontab -e, tiap Senin jam 03:00:
 *     0 3 * * 1 cd /app && npx tsx scripts/capture-sap-lead-time.ts >> /var/log/sap-lead-time.log 2>&1
 *
 * Manual run: npm run sap:capture-lead-time
 */
import { PrismaClient } from '@prisma/client'

import { isSapB1Enabled } from '@/lib/sap-b1/config'
import { getMisForWo, getPurchaseOrder, getPurchaseRequest, normalizeDocNumQuery } from '@/lib/sap-b1/documents-service'

const prisma = new PrismaClient()

function toDocNum(raw: string | null): number | null {
  if (!raw) return null

  const normalized = normalizeDocNumQuery(raw)
  const num = Number(normalized)

  return normalized && Number.isFinite(num) && num > 0 ? num : null
}

function toDate(docDate: string | null | undefined): Date | null {
  if (!docDate) return null
  const date = new Date(docDate)

  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

/** Best-effort: ambil DocDate dari kandidat MI pertama terkait WO — null bila tidak ketemu/gagal. */
async function findMiDate(woNo: string | null): Promise<{ miDocNum: string | null; miDate: Date | null }> {
  const woDocNum = toDocNum(woNo)
  if (woDocNum == null) return { miDocNum: null, miDate: null }

  try {
    const candidates = await getMisForWo(woDocNum)
    const first = candidates[0]

    return { miDocNum: first ? String(first.docNum) : null, miDate: first ? toDate(first.docDate) : null }
  } catch {
    return { miDocNum: null, miDate: null }
  }
}

async function main(): Promise<void> {
  if (!isSapB1Enabled()) {
    console.log('SAP B1 disabled (SAP_B1_ENABLED=false) — skip lead-time capture.')

    return
  }

  const candidates = await prisma.replacement.findMany({
    where: {
      deletedAt: null,
      prNo: { not: null },
      poNo: { not: null },
      sapLeadTimeSample: null
    },
    include: { commod: { include: { comp: true } } }
  })

  let captured = 0
  let skipped = 0

  for (const rep of candidates) {
    try {
      const prDocNum = toDocNum(rep.prNo)
      const poDocNum = toDocNum(rep.poNo)

      if (prDocNum == null || poDocNum == null) {
        skipped += 1
        continue
      }

      const [pr, po] = await Promise.all([getPurchaseRequest(prDocNum), getPurchaseOrder(poDocNum)])
      const prDate = toDate(pr?.docDate)
      const poDate = toDate(po?.docDate)

      if (!prDate || !poDate) {
        skipped += 1
        continue
      }

      const { miDocNum, miDate } = await findMiDate(rep.woNo)

      await prisma.sapLeadTimeSample.create({
        data: {
          idRep: rep.idRep,
          compType: rep.commod?.comp?.compType ?? null,
          prDocNum: String(prDocNum),
          prDate,
          poDocNum: String(poDocNum),
          poDate,
          miDocNum,
          miDate,
          leadTimeDays: daysBetween(prDate, poDate)
        }
      })

      captured += 1
    } catch (error) {
      skipped += 1
      console.error(`Skip id_rep=${rep.idRep} (unit ${rep.unitNo}):`, error instanceof Error ? error.message : error)
    }
  }

  console.log(JSON.stringify({ candidates: candidates.length, captured, skipped }, null, 2))
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
