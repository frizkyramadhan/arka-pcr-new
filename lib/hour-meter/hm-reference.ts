/**
 * HM reading nearest to a target date — prefer latest entry on or before the date.
 */
import { prisma } from '@/lib/prisma'

export async function getHourMeterNearestToDate(fleetUnitId: number, targetDate: Date) {
  const onOrBefore = await prisma.hm.findFirst({
    where: {
      fleetUnitId,
      deletedAt: null,
      dateHm: { lte: targetDate }
    },
    orderBy: [{ dateHm: 'desc' }, { idHm: 'desc' }]
  })

  if (onOrBefore) return onOrBefore

  return prisma.hm.findFirst({
    where: { fleetUnitId, deletedAt: null },
    orderBy: [{ dateHm: 'asc' }, { idHm: 'asc' }]
  })
}
