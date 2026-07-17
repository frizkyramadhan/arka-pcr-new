import type { Session } from 'next-auth'

import { prisma } from '@/lib/prisma'
import { getPrismaProjectFilter } from '@/lib/utils/project-scope'

export type FleetUnitOption = {
  id: number
  unit_no: string
  description: string
  project_code: string
}

/** Lightweight unit list for selects/autocomplete (no ARKFleet call). */
export async function listUnitOptionsForSession(
  session: Session,
  options: { search?: string | null; limit?: number } = {}
): Promise<FleetUnitOption[]> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50))
  const search = options.search?.trim()

  const rows = await prisma.fleetUnitCache.findMany({
    where: {
      ...getPrismaProjectFilter(session),
      ...(search
        ? {
            OR: [
              { unitNo: { contains: search } },
              { description: { contains: search } }
            ]
          }
        : {})
    },
    select: {
      fleetUnitId: true,
      unitNo: true,
      description: true,
      projectCode: true
    },
    orderBy: [{ unitNo: 'asc' }],
    take: limit
  })

  return rows.map(row => ({
    id: row.fleetUnitId,
    unit_no: row.unitNo,
    description: row.description ?? '',
    project_code: row.projectCode
  }))
}
