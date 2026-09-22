/**
 * Near-term BA PCR attachment gate: Plan Periode within 0–3 months of submit date
 * requires ≥1 polymorphic Attachment (entityType PCR_FORECAST).
 */
import { toIsoDateOnly } from '@/lib/utils/date-only'

function yearMonthParts(value: Date | string): { year: number; month: number } {
  const iso = toIsoDateOnly(value)
  if (!iso) {
    throw new Error('Invalid plan period or submit date')
  }

  const match = iso.match(/^(\d{4})-(\d{2})/)
  if (!match) {
    throw new Error('Invalid plan period or submit date')
  }

  return { year: Number(match[1]), month: Number(match[2]) }
}

/** Month difference: plan year-month minus submit year-month (calendar months only). */
export function monthsBetweenPlanAndSubmit(
  planPeriod: Date | string,
  submitDate: Date | string = new Date()
): number {
  const plan = yearMonthParts(planPeriod)
  const submit = yearMonthParts(submitDate)

  return plan.year * 12 + plan.month - (submit.year * 12 + submit.month)
}

/**
 * Attachment required when plan is not more than 3 months ahead of submit.
 * Past / same month / up to +3 months → true; +4 months and beyond → false.
 */
export function requiresNearTermAttachment(
  planPeriod: Date | string,
  submitDate: Date | string = new Date()
): boolean {
  return monthsBetweenPlanAndSubmit(planPeriod, submitDate) <= 3
}

/** Server gate: throw if near-term and no PCR_FORECAST attachments yet. */
export async function assertNearTermForecastAttachment(
  idForecast: number,
  planPeriod: Date | string,
  submitDate: Date | string = new Date()
): Promise<void> {
  if (!requiresNearTermAttachment(planPeriod, submitDate)) return

  const { prisma } = await import('@/lib/prisma')

  const count = await prisma.attachment.count({
    where: {
      entityType: 'PCR_FORECAST',
      entityId: String(idForecast)
    }
  })

  if (count < 1) {
    throw new Error(
      'Lampiran wajib untuk Plan Periode dalam 0–3 bulan dari tanggal submit (minimal satu file: Summary CBM atau CCR)'
    )
  }
}
