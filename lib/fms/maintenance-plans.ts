/**
 * Maintenance Plan — aggregate plans per project/year/month/type (FMS parity).
 * createdById is Int (User.idUser); list responses include allData + maintenancePlans.
 */
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const planInclude = {
  maintenanceType: { select: { name: true } },
  createdBy: { select: { username: true } }
} satisfies Prisma.MaintenancePlanInclude

type PlanRow = Prisma.MaintenancePlanGetPayload<{ include: typeof planInclude }>

export type MaintenancePlanDto = {
  id: string
  projectId: string
  year: number
  month: number
  maintenanceTypeId: string
  maintenanceTypeName: string | null
  sumPlan: number
  createdById: number
  createdByUsername: string | null
  createdAt: string
  updatedAt: string
}

function mapPlan(p: PlanRow): MaintenancePlanDto {
  return {
    id: p.id,
    projectId: p.projectId,
    year: p.year,
    month: p.month,
    maintenanceTypeId: p.maintenanceTypeId,
    maintenanceTypeName: p.maintenanceType?.name ?? null,
    sumPlan: p.sumPlan,
    createdById: p.createdById,
    createdByUsername: p.createdBy?.username ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString()
  }
}

export type ListMaintenancePlansQuery = {
  projectId?: string
  year?: string
  month?: string
  maintenanceTypeId?: string
}

function buildPlanWhere(query: ListMaintenancePlansQuery): Prisma.MaintenancePlanWhereInput {
  const where: Prisma.MaintenancePlanWhereInput = {}
  const projectId = query.projectId?.trim()
  if (projectId) where.projectId = projectId

  if (query.year !== undefined && query.year !== '') {
    const y = parseInt(String(query.year), 10)
    if (!Number.isNaN(y)) where.year = y
  }

  if (query.month !== undefined && query.month !== '') {
    const m = parseInt(String(query.month), 10)
    if (!Number.isNaN(m) && m >= 1 && m <= 12) where.month = m
  }

  const maintenanceTypeId = query.maintenanceTypeId?.trim()
  if (maintenanceTypeId) where.maintenanceTypeId = maintenanceTypeId

  return where
}

export async function listMaintenancePlans(query: ListMaintenancePlansQuery) {
  const where = buildPlanWhere(query)

  const [plans, allData] = await Promise.all([
    prisma.maintenancePlan.findMany({
      where,
      include: planInclude,
      orderBy: [{ createdAt: 'desc' }]
    }),
    prisma.maintenancePlan.findMany({
      include: planInclude,
      orderBy: [{ createdAt: 'desc' }]
    })
  ])

  return {
    allData: allData.map(mapPlan),
    maintenancePlans: plans.map(mapPlan),
    total: plans.length
  }
}

export async function getMaintenancePlanById(id: string): Promise<MaintenancePlanDto | null> {
  const plan = await prisma.maintenancePlan.findUnique({
    where: { id },
    include: {
      maintenanceType: { select: { id: true, name: true } },
      createdBy: { select: { idUser: true, username: true } }
    }
  })
  if (!plan) return null

  return mapPlan(plan as PlanRow)
}

export function parseCreatedById(value: unknown, fallbackSessionUserId: number): number | null {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    const n = Number(value)
    if (!Number.isNaN(n) && n > 0) return n
  }
  if (fallbackSessionUserId > 0 && !Number.isNaN(fallbackSessionUserId)) {
    return fallbackSessionUserId
  }

  return null
}

export async function createMaintenancePlan(
  body: {
    projectId?: string
    year?: unknown
    month?: unknown
    maintenanceTypeId?: string
    sumPlan?: unknown
    createdById?: unknown
  },
  sessionUserId: number
): Promise<
  | { ok: true; maintenancePlan: MaintenancePlanDto }
  | { ok: false; status: number; error: string }
> {
  const { projectId, year, month, maintenanceTypeId, sumPlan, createdById } = body

  if (!projectId || !String(projectId).trim()) {
    return { ok: false, status: 400, error: 'projectId is required' }
  }

  const y = parseInt(String(year), 10)
  const m = parseInt(String(month), 10)
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) {
    return { ok: false, status: 400, error: 'year and month (1-12) are required' }
  }

  if (!maintenanceTypeId || !String(maintenanceTypeId).trim()) {
    return { ok: false, status: 400, error: 'maintenanceTypeId is required' }
  }

  const sum = parseInt(String(sumPlan), 10)
  if (Number.isNaN(sum) || sum < 0) {
    return { ok: false, status: 400, error: 'sumPlan must be a non-negative number' }
  }

  const createdBy = parseCreatedById(createdById, sessionUserId)
  if (!createdBy) {
    return { ok: false, status: 400, error: 'createdById is required' }
  }

  const projectIdTrim = String(projectId).trim()
  const maintenanceTypeIdTrim = String(maintenanceTypeId).trim()

  const existing = await prisma.maintenancePlan.findUnique({
    where: {
      projectId_year_month_maintenanceTypeId: {
        projectId: projectIdTrim,
        year: y,
        month: m,
        maintenanceTypeId: maintenanceTypeIdTrim
      }
    }
  })
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: 'Plan already exists for this project, year, month and maintenance type'
    }
  }

  const created = await prisma.maintenancePlan.create({
    data: {
      projectId: projectIdTrim,
      year: y,
      month: m,
      maintenanceTypeId: maintenanceTypeIdTrim,
      sumPlan: sum,
      createdById: createdBy
    },
    include: planInclude
  })

  return { ok: true, maintenancePlan: mapPlan(created) }
}

export async function updateMaintenancePlan(
  id: string,
  body: {
    projectId?: string
    year?: unknown
    month?: unknown
    maintenanceTypeId?: string
    sumPlan?: unknown
  }
): Promise<{ ok: true; item: MaintenancePlanDto } | { ok: false; status: number; error: string }> {
  const plan = await prisma.maintenancePlan.findUnique({ where: { id } })
  if (!plan) {
    return { ok: false, status: 404, error: 'Maintenance plan not found' }
  }

  const { projectId, year, month, maintenanceTypeId, sumPlan } = body
  const data: Prisma.MaintenancePlanUpdateInput = {}

  if (sumPlan !== undefined) {
    const sum = parseInt(String(sumPlan), 10)
    if (Number.isNaN(sum) || sum < 0) {
      return { ok: false, status: 400, error: 'sumPlan must be a non-negative number' }
    }
    data.sumPlan = sum
  }
  if (projectId !== undefined) data.projectId = String(projectId).trim()
  if (year !== undefined) {
    const y = parseInt(String(year), 10)
    if (Number.isNaN(y)) return { ok: false, status: 400, error: 'year must be a number' }
    data.year = y
  }
  if (month !== undefined) {
    const mo = parseInt(String(month), 10)
    if (Number.isNaN(mo) || mo < 1 || mo > 12) {
      return { ok: false, status: 400, error: 'month must be 1-12' }
    }
    data.month = mo
  }
  let nextMaintenanceTypeId = plan.maintenanceTypeId
  if (maintenanceTypeId !== undefined) {
    nextMaintenanceTypeId = String(maintenanceTypeId).trim()
    data.maintenanceType = { connect: { id: nextMaintenanceTypeId } }
  }

  if (Object.keys(data).length === 0) {
    const current = await prisma.maintenancePlan.findUnique({ where: { id }, include: planInclude })
    if (!current) return { ok: false, status: 404, error: 'Maintenance plan not found' }

    return { ok: true, item: mapPlan(current) }
  }

  const composite = {
    projectId: (data.projectId as string | undefined) ?? plan.projectId,
    year: (data.year as number | undefined) ?? plan.year,
    month: (data.month as number | undefined) ?? plan.month,
    maintenanceTypeId: nextMaintenanceTypeId
  }

  const existingOther = await prisma.maintenancePlan.findFirst({
    where: {
      id: { not: id },
      ...composite
    }
  })
  if (existingOther) {
    return {
      ok: false,
      status: 409,
      error: 'Another plan already exists for this project, year, month and maintenance type'
    }
  }

  const updated = await prisma.maintenancePlan.update({
    where: { id },
    data,
    include: planInclude
  })

  return { ok: true, item: mapPlan(updated) }
}

export async function deleteMaintenancePlan(
  id: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const plan = await prisma.maintenancePlan.findUnique({
    where: { id },
    include: { actuals: true }
  })
  if (!plan) {
    return { ok: false, status: 404, error: 'Maintenance plan not found' }
  }
  if (plan.actuals.length > 0) {
    return {
      ok: false,
      status: 409,
      error: 'Cannot delete: plan has linked actuals. Remove or unlink actuals first.'
    }
  }

  try {
    await prisma.maintenancePlan.delete({ where: { id } })

    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 404, error: 'Maintenance plan not found' }
    }
    throw e
  }
}

function parseImportNum(v: unknown): number {
  if (v === null || v === undefined) return NaN
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10)

  return Number.isNaN(n) ? NaN : n
}

export type ImportPlanRow = {
  projectId?: unknown
  year?: unknown
  month?: unknown
  maintenanceTypeId?: unknown
  sumPlan?: unknown
}

export async function importMaintenancePlans(
  plans: ImportPlanRow[],
  createdById: number
): Promise<{ created: number; updated: number; errors?: { row: number; message: string }[] }> {
  const created: string[] = []
  const updated: string[] = []
  const errors: { row: number; message: string }[] = []

  for (let row = 0; row < plans.length; row++) {
    const p = plans[row]
    const projectId = p?.projectId != null ? String(p.projectId).trim() : ''
    const year = parseImportNum(p?.year)
    const month = parseImportNum(p?.month)
    const maintenanceTypeId = p?.maintenanceTypeId != null ? String(p.maintenanceTypeId).trim() : ''
    const sumPlan = parseImportNum(p?.sumPlan)

    if (!projectId) {
      errors.push({ row: row + 1, message: 'Project is required' })
      continue
    }
    if (Number.isNaN(year)) {
      errors.push({ row: row + 1, message: 'Year must be a number' })
      continue
    }
    if (Number.isNaN(month) || month < 1 || month > 12) {
      errors.push({ row: row + 1, message: 'Month must be 1-12' })
      continue
    }
    if (!maintenanceTypeId) {
      errors.push({ row: row + 1, message: 'Maintenance Type is required' })
      continue
    }
    if (Number.isNaN(sumPlan) || sumPlan < 0) {
      errors.push({ row: row + 1, message: 'Sum Plan must be a non-negative number' })
      continue
    }

    try {
      const existing = await prisma.maintenancePlan.findUnique({
        where: {
          projectId_year_month_maintenanceTypeId: {
            projectId,
            year,
            month,
            maintenanceTypeId
          }
        }
      })
      if (existing) {
        await prisma.maintenancePlan.update({
          where: { id: existing.id },
          data: { sumPlan }
        })
        updated.push(existing.id)
      } else {
        const createdPlan = await prisma.maintenancePlan.create({
          data: {
            projectId,
            year,
            month,
            maintenanceTypeId,
            sumPlan,
            createdById
          }
        })
        created.push(createdPlan.id)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upsert failed'
      errors.push({ row: row + 1, message })
    }
  }

  return {
    created: created.length,
    updated: updated.length,
    errors: errors.length ? errors : undefined
  }
}
