/**
 * AI #8 — Agregasi lead-time procurement (PR→PO) dari sap_lead_time_sample, on-demand
 * (tanpa tabel stat terpisah — jumlah sample masih kecil di fase awal, sesuai rencana implementasi).
 * Dipakai untuk merekomendasikan "kapan sebaiknya PR diajukan" di samping RUL by AI (AI #1).
 */
import { prisma } from '@/lib/prisma'

export type LeadTimeStats = {
  avgLeadTimeDays: number
  sampleCount: number
}

/** Rata-rata leadTimeDays untuk compType tertentu — null bila compType kosong atau tidak ada sample. */
export async function getLeadTimeStatsForCompType(compType: string | null | undefined): Promise<LeadTimeStats | null> {
  if (!compType) return null

  const result = await prisma.sapLeadTimeSample.aggregate({
    where: { compType, leadTimeDays: { not: null } },
    _avg: { leadTimeDays: true },
    _count: { leadTimeDays: true }
  })

  const sampleCount = result._count.leadTimeDays
  if (sampleCount === 0 || result._avg.leadTimeDays == null) return null

  return { avgLeadTimeDays: result._avg.leadTimeDays, sampleCount }
}
