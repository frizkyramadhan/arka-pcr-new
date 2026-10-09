/**
 * Maintenance Plan — header bulan (site + tahun + bulan + program).
 * Tanggal per unit ada di maintenance_plan_details. sum_plan = jumlah detail, atau kuota lama.
 * Activity log: logName `maintenance-plans` (subject id string → properties.entityId).
 */
import { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { attributeChanges, logActivity } from '@/lib/activity-log'
import { planHeaderWhere } from '@/lib/fms/maintenance-plan-list-filter'
import { scheduleDatePermissionError } from '@/lib/fms/schedule-date-permission'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { paginationSkipTake } from '@/lib/utils/list-pagination'
import { canAccessProject, resolveProjectIdFilter } from '@/lib/utils/project-scope'

/** Longest pending reason, matching maintenance_plan_details.pending_reason VARCHAR(500). */
const PENDING_REASON_MAX = 500

const planInclude = {
  maintenanceType: { select: { name: true } },
  createdBy: { select: { username: true } },
  _count: { select: { actuals: true } }
} satisfies Prisma.MaintenancePlanInclude

const planDetailInclude = {
  ...planInclude,
  details: {
    orderBy: [{ planDate: 'asc' }, { fleetUnit: { unitNo: 'asc' } }],
    select: {
      id: true,
      fleetUnitId: true,
      planDate: true,
      fleetUnit: { select: { unitNo: true, modelName: true, description: true } }
    }
  },
  actuals: { select: { maintenancePlanDetailId: true } }
} satisfies Prisma.MaintenancePlanInclude

type PlanRow = Prisma.MaintenancePlanGetPayload<{ include: typeof planDetailInclude }>

export type PlanDetailDto = {
  id: string
  fleetUnitId: number
  unitNo: string | null
  unitModel: string | null
  unitDescription: string | null
  planDate: string
  hasActual: boolean
}

export type MaintenancePlanDto = {
  id: string
  projectId: string
  year: number
  month: number
  maintenanceTypeId: string
  maintenanceTypeName: string | null

  /** Jumlah detail, atau angka kuota lama bila belum ada detail. */
  sumPlan: number | null
  hasActual: boolean
  createdById: number
  createdByUsername: string | null
  createdAt: string
  updatedAt: string
  details?: PlanDetailDto[]
}

function mapPlan(p: PlanRow, withDetails = false): MaintenancePlanDto {
  const linkedDetailIds = new Set(
    (p.actuals ?? []).map(actual => actual.maintenancePlanDetailId).filter((id): id is string => Boolean(id))
  )

  const details = withDetails
    ? (p.details ?? []).map(detail => {
        const planDate = toIsoDateOnly(detail.planDate) ?? ''

        return {
          id: detail.id,
          fleetUnitId: detail.fleetUnitId,
          unitNo: detail.fleetUnit?.unitNo ?? null,
          unitModel: detail.fleetUnit?.modelName ?? null,
          unitDescription: detail.fleetUnit?.description ?? null,
          planDate,
          hasActual: linkedDetailIds.has(detail.id)
        }
      })
    : undefined

  return {
    id: p.id,
    projectId: p.projectId,
    year: p.year,
    month: p.month,
    maintenanceTypeId: p.maintenanceTypeId,
    maintenanceTypeName: p.maintenanceType?.name ?? null,
    sumPlan: p.sumPlan,
    hasActual: (p._count?.actuals ?? 0) > 0,
    createdById: p.createdById,
    createdByUsername: p.createdBy?.username ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    ...(details ? { details } : {})
  }
}

/** Tanggal kalender YYYY-MM-DD, serial Excel, atau Date. Tahun/bulan mengikuti tanggal itu. */
export function parsePlanDateInput(
  value: unknown
): { iso: string; year: number; month: number; date: Date } | null {
  if (value == null || value === '') return null

  let iso: string | null = null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    iso = toIsoDateOnly(value)
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000))
    if (!Number.isNaN(utc.getTime())) {
      const y = utc.getUTCFullYear()
      const m = String(utc.getUTCMonth() + 1).padStart(2, '0')
      const d = String(utc.getUTCDate()).padStart(2, '0')
      iso = `${y}-${m}-${d}`
    }
  } else {
    const text = String(value).trim()
    const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      iso = text.slice(0, 10)
    } else if (dmy) {
      const day = Number(dmy[1])
      const month = Number(dmy[2])
      const year = Number(dmy[3])
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    } else {
      iso = toIsoDateOnly(text)
    }
  }

  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null

  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { iso, year, month, date: new Date(Date.UTC(year, month - 1, day)) }
}

export type ListMaintenancePlansQuery = {
  projectId?: string
  year?: string
  month?: string
  maintenanceTypeId?: string
  withDetails?: boolean
  search?: string

  /** Set when the grid sends page (TableServerSide). Absent = full list for export and unit tabs. */
  page?: number
  pageSize?: number
  sortField?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

/** Year, month, type. Project scope ditimpa resolveProjectIdFilter, bukan filter UI mentah. */
function buildPlanWhere(query: ListMaintenancePlansQuery): Prisma.MaintenancePlanWhereInput {
  const where: Prisma.MaintenancePlanWhereInput = { ...planHeaderWhere(query) }
  const search = query.search?.trim()

  if (search) {
    where.AND = [
      {
        OR: [{ projectId: { contains: search } }, { maintenanceType: { name: { contains: search } } }]
      }
    ]
  }

  return where
}

function planOrderBy(query: ListMaintenancePlansQuery): Prisma.MaintenancePlanOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'

  switch (query.sortField) {
    case 'projectId':
      return [{ projectId: direction }, { id: 'asc' }]
    case 'year':
      return [{ year: direction }, { month: direction }, { id: 'asc' }]
    case 'month':
      return [{ month: direction }, { year: direction }, { id: 'asc' }]
    case 'maintenanceTypeName':
      return [{ maintenanceType: { name: direction } }, { id: 'asc' }]
    case 'sumPlan':
      return [{ sumPlan: direction }, { id: 'asc' }]
    default:
      return [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }]
  }
}

export async function listMaintenancePlans(session: Session, query: ListMaintenancePlansQuery) {
  const scope = resolveProjectIdFilter(session, query.projectId)
  const where = { ...buildPlanWhere(query), ...scope }
  const include = query.withDetails ? planDetailInclude : planInclude
  const orderBy = planOrderBy(query)

  if (query.page != null) {
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100)
    const { skip, take } = paginationSkipTake({ page: query.page, pageSize })

    const [total, plans] = await Promise.all([
      prisma.maintenancePlan.count({ where }),
      prisma.maintenancePlan.findMany({ where, include, orderBy, skip, take })
    ])

    const maintenancePlans = plans.map(row => mapPlan(row as PlanRow, Boolean(query.withDetails)))

    return {
      total,
      data: maintenancePlans,
      rows: maintenancePlans,
      maintenancePlans,
      page: query.page,
      pageSize
    }
  }

  // maintenancePlans = filter layar + scope. allData hanya scope (dropdown), jangan dipakai export.
  const [plans, allData] = await Promise.all([
    prisma.maintenancePlan.findMany({ where, include, orderBy }),
    prisma.maintenancePlan.findMany({ where: resolveProjectIdFilter(session, null), include: planInclude, orderBy })
  ])

  return {
    allData: allData.map(row => mapPlan(row as PlanRow)),
    maintenancePlans: plans.map(row => mapPlan(row as PlanRow, Boolean(query.withDetails))),
    total: plans.length
  }
}

export async function getMaintenancePlanById(id: string): Promise<MaintenancePlanDto | null> {
  const plan = await prisma.maintenancePlan.findUnique({
    where: { id },
    include: planDetailInclude
  })
  if (!plan) return null

  return mapPlan(plan as PlanRow, true)
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

async function loadPlanUnit(fleetUnitId: number) {
  return prisma.fleetUnitCache.findUnique({
    where: { fleetUnitId },
    select: { fleetUnitId: true, unitNo: true, projectCode: true }
  })
}

async function ensurePlanHeader(input: {
  projectId: string
  year: number
  month: number
  maintenanceTypeId: string
  createdById: number
}) {
  const existing = await prisma.maintenancePlan.findFirst({
    where: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      maintenanceTypeId: input.maintenanceTypeId
    }
  })
  if (existing) return { plan: existing, created: false }

  const plan = await prisma.maintenancePlan.create({
    data: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      maintenanceTypeId: input.maintenanceTypeId,
      sumPlan: 0,
      createdById: input.createdById
    }
  })

  return { plan, created: true }
}

async function refreshSumPlan(planId: string) {
  const count = await prisma.maintenancePlanDetail.count({ where: { maintenancePlanId: planId } })
  await prisma.maintenancePlan.update({ where: { id: planId }, data: { sumPlan: count } })

  return count
}

export async function createMaintenancePlan(
  body: {
    fleetUnitId?: unknown
    unitId?: unknown
    maintenanceTypeId?: string
    planDate?: unknown
    createdById?: unknown
  },
  sessionUserId: number
): Promise<
  | { ok: true; maintenancePlan: MaintenancePlanDto }
  | { ok: false; status: number; error: string }
> {
  const fleetRaw = body.fleetUnitId ?? body.unitId
  const fleetUnitId = Number(fleetRaw)
  if (!Number.isInteger(fleetUnitId) || fleetUnitId <= 0) {
    return { ok: false, status: 400, error: 'Unit is required' }
  }

  const unit = await loadPlanUnit(fleetUnitId)
  if (!unit) {
    return { ok: false, status: 400, error: 'Unit not found' }
  }

  if (!body.maintenanceTypeId || !String(body.maintenanceTypeId).trim()) {
    return { ok: false, status: 400, error: 'maintenanceTypeId is required' }
  }

  const planDate = parsePlanDateInput(body.planDate)
  if (!planDate) {
    return { ok: false, status: 400, error: 'planDate is required (YYYY-MM-DD)' }
  }

  const createdBy = parseCreatedById(body.createdById, sessionUserId)
  if (!createdBy) {
    return { ok: false, status: 400, error: 'createdById is required' }
  }

  const maintenanceTypeId = String(body.maintenanceTypeId).trim()

  const { plan } = await ensurePlanHeader({
    projectId: unit.projectCode,
    year: planDate.year,
    month: planDate.month,
    maintenanceTypeId,
    createdById: createdBy
  })

  const duplicate = await prisma.maintenancePlanDetail.findFirst({
    where: { maintenancePlanId: plan.id, fleetUnitId, planDate: planDate.date }
  })
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      error: 'Plan already exists for this unit, program and plan date'
    }
  }

  await prisma.maintenancePlanDetail.create({
    data: { maintenancePlanId: plan.id, fleetUnitId, planDate: planDate.date }
  })
  await refreshSumPlan(plan.id)

  const created = await prisma.maintenancePlan.findUnique({
    where: { id: plan.id },
    include: planDetailInclude
  })
  if (!created) return { ok: false, status: 404, error: 'Maintenance plan not found' }

  const mapped = mapPlan(created, true)
  logActivity({
    causerId: createdBy,
    logName: 'maintenance-plans',
    event: 'created',
    description: `created maintenance plan detail ${unit.unitNo} ${planDate.iso} — ${mapped.maintenanceTypeName ?? 'type'}`,
    subjectType: 'MaintenancePlan',
    properties: {
      entityId: mapped.id,
      projectId: mapped.projectId,
      projectCode: mapped.projectId,
      fleetUnitId,
      unitNo: unit.unitNo,
      planDate: planDate.iso,
      year: mapped.year,
      month: mapped.month,
      maintenanceTypeId: mapped.maintenanceTypeId,
      maintenanceTypeName: mapped.maintenanceTypeName
    }
  })

  return { ok: true, maintenancePlan: mapped }
}

export async function updateMaintenancePlan(
  id: string,
  body: {
    maintenanceTypeId?: string
    projectId?: string
    year?: unknown
    month?: unknown
  },
  causerId?: number | null
): Promise<{ ok: true; item: MaintenancePlanDto } | { ok: false; status: number; error: string }> {
  const plan = await prisma.maintenancePlan.findUnique({ where: { id } })
  if (!plan) {
    return { ok: false, status: 404, error: 'Maintenance plan not found' }
  }

  const nextTypeId =
    body.maintenanceTypeId !== undefined && String(body.maintenanceTypeId).trim() !== ''
      ? String(body.maintenanceTypeId).trim()
      : plan.maintenanceTypeId

  const nextProjectId =
    body.projectId !== undefined && String(body.projectId).trim() !== ''
      ? String(body.projectId).trim()
      : plan.projectId
  const nextYear = body.year !== undefined && String(body.year).trim() !== '' ? Number(body.year) : plan.year
  const nextMonth = body.month !== undefined && String(body.month).trim() !== '' ? Number(body.month) : plan.month
  if (!Number.isInteger(nextYear) || !Number.isInteger(nextMonth) || nextMonth < 1 || nextMonth > 12) {
    return { ok: false, status: 400, error: 'Year and month are required' }
  }

  const duplicate = await prisma.maintenancePlan.findFirst({
    where: {
      id: { not: id },
      projectId: nextProjectId,
      year: nextYear,
      month: nextMonth,
      maintenanceTypeId: nextTypeId
    }
  })
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      error: 'Another plan already exists for this project, month and program'
    }
  }

  const updated = await prisma.maintenancePlan.update({
    where: { id },
    data: {
      projectId: nextProjectId,
      year: nextYear,
      month: nextMonth,
      maintenanceType: { connect: { id: nextTypeId } }
    },
    include: planInclude
  })

  const mapped = mapPlan(updated as PlanRow)
  logActivity({
    causerId: causerId ?? null,
    logName: 'maintenance-plans',
    event: 'updated',
    description: `updated maintenance plan ${mapped.projectId} ${mapped.year}-${mapped.month} — ${mapped.maintenanceTypeName ?? 'type'}`,
    subjectType: 'MaintenancePlan',
    properties: {
      entityId: mapped.id,
      projectId: mapped.projectId,
      projectCode: mapped.projectId,
      year: mapped.year,
      month: mapped.month,
      maintenanceTypeId: mapped.maintenanceTypeId,
      maintenanceTypeName: mapped.maintenanceTypeName
    },
    attributeChanges: attributeChanges(
      {
        projectId: plan.projectId,
        year: plan.year,
        month: plan.month,
        maintenanceTypeId: plan.maintenanceTypeId
      },
      {
        projectId: mapped.projectId,
        year: mapped.year,
        month: mapped.month,
        maintenanceTypeId: mapped.maintenanceTypeId
      }
    )
  })

  return { ok: true, item: mapped }
}

export async function deleteMaintenancePlan(
  id: string,
  causerId?: number | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const plan = await prisma.maintenancePlan.findUnique({
    where: { id },
    include: {
      actuals: true,
      maintenanceType: { select: { name: true } }
    }
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

    logActivity({
      causerId: causerId ?? null,
      logName: 'maintenance-plans',
      event: 'deleted',
      description: `deleted maintenance plan ${plan.projectId} ${plan.year}-${plan.month}`,
      subjectType: 'MaintenancePlan',
      properties: {
        entityId: plan.id,
        projectId: plan.projectId,
        projectCode: plan.projectId,
        year: plan.year,
        month: plan.month,
        maintenanceTypeId: plan.maintenanceTypeId,
        maintenanceTypeName: plan.maintenanceType?.name ?? null,
        sumPlan: plan.sumPlan
      }
    })

    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 404, error: 'Maintenance plan not found' }
    }
    throw e
  }
}

export type ScheduleCell = {
  fleetUnitId: number
  planDate: string
  unitNo?: string | null
}

/**
 * Simpan centang grid: satu plan per unit + program + tanggal di bulan itu.
 * Centang baru dibuat. Centang yang dilepas dihapus bila belum punya actual.
 * Baris kuota lama (tanpa unit / tanpa tanggal) tidak ikut.
 */
export async function syncMaintenanceSchedule(
  body: {
    projectId?: unknown
    year?: unknown
    month?: unknown
    maintenanceTypeId?: unknown
    cells?: unknown

    /** Unit yang tampil di grid. Hapus hanya berlaku untuk unit ini. */
    unitIds?: unknown
  },
  createdById: number,
  options: { allowCreate?: boolean; allowModifyExisting?: boolean; allowDelete?: boolean }
): Promise<
  | { ok: true; created: number; deleted: number; kept: number }
  | { ok: false; status: number; error: string; locked?: ScheduleCell[] }
> {
  const projectId = String(body.projectId ?? '').trim()
  const year = Number(body.year)
  const month = Number(body.month)
  const maintenanceTypeId = String(body.maintenanceTypeId ?? '').trim()
  if (!projectId) return { ok: false, status: 400, error: 'Project is required' }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, status: 400, error: 'Year is required' }
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, status: 400, error: 'Month is required' }
  }
  if (!maintenanceTypeId) return { ok: false, status: 400, error: 'Program is required' }
  if (!createdById) return { ok: false, status: 400, error: 'createdById is required' }

  const type = await prisma.maintenanceType.findUnique({
    where: { id: maintenanceTypeId },
    select: { id: true, name: true }
  })
  if (!type) return { ok: false, status: 400, error: 'Program not found' }

  const units = await prisma.fleetUnitCache.findMany({
    where: { projectCode: projectId },
    select: { fleetUnitId: true, unitNo: true }
  })
  const unitById = new Map(units.map(unit => [unit.fleetUnitId, unit.unitNo]))

  const scopeIds = Array.isArray(body.unitIds)
    ? new Set(
        body.unitIds
          .map(id => Number(id))
          .filter(id => Number.isInteger(id) && unitById.has(id))
      )
    : null

  const rawCells = Array.isArray(body.cells) ? body.cells : []
  const desired = new Map<string, { fleetUnitId: number; planDate: { iso: string; date: Date } }>()
  for (const cell of rawCells) {
    const fleetUnitId = Number((cell as { fleetUnitId?: unknown })?.fleetUnitId)
    const planDate = parsePlanDateInput((cell as { planDate?: unknown })?.planDate)
    if (!Number.isInteger(fleetUnitId) || !unitById.has(fleetUnitId) || (scopeIds && !scopeIds.has(fleetUnitId))) {
      return { ok: false, status: 400, error: 'Each date must belong to a unit in this project' }
    }
    if (!planDate || planDate.year !== year || planDate.month !== month) {
      return { ok: false, status: 400, error: 'Each date must fall in the selected month' }
    }
    desired.set(`${fleetUnitId}|${planDate.iso}`, { fleetUnitId, planDate })
  }

  const { plan: header } = await ensurePlanHeader({
    projectId,
    year,
    month,
    maintenanceTypeId,
    createdById
  })

  const [existing, actuals] = await Promise.all([
    prisma.maintenancePlanDetail.findMany({ where: { maintenancePlanId: header.id } }),
    prisma.maintenanceActual.findMany({
      where: { maintenancePlanId: header.id },
      select: { maintenancePlanDetailId: true }
    })
  ])

  const linkedDetailIds = new Set(
    actuals.map(actual => actual.maintenancePlanDetailId).filter((id): id is string => Boolean(id))
  )

  const existingByKey = new Map<string, (typeof existing)[number]>()
  for (const row of existing) {
    const iso = toIsoDateOnly(row.planDate)
    if (!iso) continue
    existingByKey.set(`${row.fleetUnitId}|${iso}`, row)
  }

  const toCreate: { fleetUnitId: number; planDate: { iso: string; date: Date } }[] = []
  for (const [key, want] of desired) {
    if (!existingByKey.has(key)) toCreate.push(want)
  }

  const toDelete: (typeof existing)[number][] = []
  const locked: ScheduleCell[] = []
  for (const [key, row] of existingByKey) {
    if (desired.has(key)) continue
    if (scopeIds && !scopeIds.has(row.fleetUnitId)) continue
    const iso = toIsoDateOnly(row.planDate) ?? ''
    if (linkedDetailIds.has(row.id)) {
      locked.push({
        fleetUnitId: row.fleetUnitId,
        planDate: iso,
        unitNo: unitById.get(row.fleetUnitId) ?? null
      })
    } else {
      toDelete.push(row)
    }
  }

  if (locked.length) {
    const sample = locked
      .slice(0, 5)
      .map(item => `${item.unitNo || item.fleetUnitId} ${item.planDate}`)
      .join(', ')

    return {
      ok: false,
      status: 409,
      error: `Dates that already have an actual cannot be cleared: ${sample}`,
      locked
    }
  }

  const permissionError = scheduleDatePermissionError(toCreate.length, toDelete.length, options)
  if (permissionError) {
    return { ok: false, status: 403, error: permissionError }
  }

  await prisma.$transaction(async tx => {
    if (toDelete.length) {
      await tx.maintenancePlanDetail.deleteMany({ where: { id: { in: toDelete.map(row => row.id) } } })
    }
    if (toCreate.length) {
      await tx.maintenancePlanDetail.createMany({
        data: toCreate.map(item => ({
          maintenancePlanId: header.id,
          fleetUnitId: item.fleetUnitId,
          planDate: item.planDate.date
        }))
      })
    }
  })
  await refreshSumPlan(header.id)

  logActivity({
    causerId: createdById,
    logName: 'maintenance-plans',
    event: 'updated',
    description: `saved maintenance schedule ${projectId} ${year}-${month} ${type.name} (created ${toCreate.length}, removed ${toDelete.length})`,
    subjectType: 'MaintenancePlan',
    properties: {
      projectId,
      projectCode: projectId,
      year,
      month,
      maintenanceTypeId,
      maintenanceTypeName: type.name,
      created: toCreate.length,
      deleted: toDelete.length,
      kept: desired.size - toCreate.length
    }
  })

  return { ok: true, created: toCreate.length, deleted: toDelete.length, kept: desired.size - toCreate.length }
}

export type ImportPlanRow = {
  row?: number
  unitNo?: unknown
  fleetUnitId?: unknown
  planDate?: unknown
  program?: unknown
  maintenanceTypeId?: unknown
  projectId?: unknown
}

async function upsertPlanLine(input: {
  fleetUnitId: number
  projectCode: string
  maintenanceTypeId: string
  planDate: { year: number; month: number; iso: string; date: Date }
  createdById: number
  created: string[]
  updated: string[]
}) {
  const { plan } = await ensurePlanHeader({
    projectId: input.projectCode,
    year: input.planDate.year,
    month: input.planDate.month,
    maintenanceTypeId: input.maintenanceTypeId,
    createdById: input.createdById
  })

  const existing = await prisma.maintenancePlanDetail.findFirst({
    where: {
      maintenancePlanId: plan.id,
      fleetUnitId: input.fleetUnitId,
      planDate: input.planDate.date
    }
  })
  if (existing) {
    input.updated.push(existing.id)

    return
  }

  const createdDetail = await prisma.maintenancePlanDetail.create({
    data: {
      maintenancePlanId: plan.id,
      fleetUnitId: input.fleetUnitId,
      planDate: input.planDate.date
    }
  })
  await refreshSumPlan(plan.id)
  input.created.push(createdDetail.id)
}

export async function importMaintenancePlans(
  plans: ImportPlanRow[],
  createdById: number
): Promise<{ created: number; updated: number; errors?: { row: number; message: string }[] }> {
  const created: string[] = []
  const updated: string[] = []
  const errors: { row: number; message: string }[] = []

  const [types, units] = await Promise.all([
    prisma.maintenanceType.findMany({ select: { id: true, name: true } }),
    prisma.fleetUnitCache.findMany({
      select: { fleetUnitId: true, unitNo: true, projectCode: true }
    })
  ])
  const typeByName = new Map(types.map(t => [t.name.trim().toLowerCase(), t.id]))
  const unitByNo = new Map<string, { fleetUnitId: number; projectCode: string }>()
  const duplicateUnitNos = new Set<string>()
  for (const unit of units) {
    const key = unit.unitNo.trim().toUpperCase()
    if (unitByNo.has(key)) duplicateUnitNos.add(key)
    else unitByNo.set(key, { fleetUnitId: unit.fleetUnitId, projectCode: unit.projectCode })
  }

  for (let row = 0; row < plans.length; row++) {
    const p = plans[row]
    const excelRow = p?.row ?? row + 1
    const unitNo = p?.unitNo != null ? String(p.unitNo).trim() : ''
    const program = p?.program != null ? String(p.program).trim() : ''
    const typeFromId = p?.maintenanceTypeId != null ? String(p.maintenanceTypeId).trim() : ''
    const maintenanceTypeId = typeFromId || typeByName.get(program.toLowerCase()) || ''
    const planDate = parsePlanDateInput(p?.planDate)

    if (!unitNo && (p?.fleetUnitId == null || String(p.fleetUnitId).trim() === '')) {
      errors.push({ row: excelRow, message: 'Unit is required' })
      continue
    }
    if (!maintenanceTypeId) {
      errors.push({ row: excelRow, message: `Program "${program || '(empty)'}" not found` })
      continue
    }
    if (!planDate) {
      errors.push({ row: excelRow, message: 'Plan Date is required (YYYY-MM-DD)' })
      continue
    }

    const unitKey = unitNo.toUpperCase()
    if (unitNo && duplicateUnitNos.has(unitKey)) {
      errors.push({ row: excelRow, message: `Unit "${unitNo}" is not unique` })
      continue
    }

    const fromNo = unitNo ? unitByNo.get(unitKey) : null
    const fleetUnitId = fromNo?.fleetUnitId ?? Number(p?.fleetUnitId)
    const requestedProject = p?.projectId != null ? String(p.projectId).trim() : ''
    if (!fromNo) {
      const unit = Number.isInteger(fleetUnitId) ? await loadPlanUnit(fleetUnitId) : null
      if (!unit) {
        errors.push({ row: excelRow, message: `Unit "${unitNo || fleetUnitId}" not found` })
        continue
      }
      if (requestedProject && requestedProject.toUpperCase() !== unit.projectCode.toUpperCase()) {
        errors.push({
          row: excelRow,
          message: `Unit "${unit.unitNo}" belongs to project ${unit.projectCode}, not ${requestedProject}`
        })
        continue
      }
      try {
        await upsertPlanLine({
          fleetUnitId: unit.fleetUnitId,
          projectCode: unit.projectCode,
          maintenanceTypeId,
          planDate,
          createdById,
          created,
          updated
        })
      } catch (e) {
        errors.push({ row: excelRow, message: e instanceof Error ? e.message : 'Upsert failed' })
      }
      continue
    }

    if (requestedProject && requestedProject.toUpperCase() !== fromNo.projectCode.toUpperCase()) {
      errors.push({
        row: excelRow,
        message: `Unit "${unitNo}" belongs to project ${fromNo.projectCode}, not ${requestedProject}`
      })
      continue
    }

    try {
      await upsertPlanLine({
        fleetUnitId: fromNo.fleetUnitId,
        projectCode: fromNo.projectCode,
        maintenanceTypeId,
        planDate,
        createdById,
        created,
        updated
      })
    } catch (e) {
      errors.push({ row: excelRow, message: e instanceof Error ? e.message : 'Upsert failed' })
    }
  }

  if (created.length || updated.length) {
    logActivity({
      causerId: createdById,
      logName: 'maintenance-plans',
      event: 'updated',
      description: `imported maintenance plans (created ${created.length}, updated ${updated.length})`,
      subjectType: 'MaintenancePlan',
      properties: {
        created: created.length,
        updated: updated.length,
        errorCount: errors.length
      }
    })
  }

  return {
    created: created.length,
    updated: updated.length,
    errors: errors.length ? errors : undefined
  }
}

/**
 * Set or clear why a plan row is still pending (Backlog drill-down). Empty text clears it.
 * The user must have access to the plan's site.
 */
export async function updatePlanDetailReason(
  session: Session,
  detailId: string,
  reason: unknown,
  causerId: number | null
): Promise<
  | { ok: true; value: { detailId: string; text: string | null; updatedAt: string | null; updatedBy: string | null } }
  | { ok: false; status: number; error: string }
> {
  const detail = await prisma.maintenancePlanDetail.findUnique({
    where: { id: detailId },
    include: { maintenancePlan: { select: { projectId: true } }, fleetUnit: { select: { unitNo: true } } }
  })
  if (!detail) return { ok: false, status: 404, error: 'Plan row not found' }
  if (!canAccessProject(session, detail.maintenancePlan.projectId)) {
    return { ok: false, status: 403, error: 'No access to this site' }
  }

  const text = String(reason ?? '').trim() || null
  if (text && text.length > PENDING_REASON_MAX) {
    return { ok: false, status: 400, error: `Reason must be ${PENDING_REASON_MAX} characters or fewer` }
  }

  const updated = await prisma.maintenancePlanDetail.update({
    where: { id: detailId },
    data: { pendingReason: text, pendingReasonUpdatedAt: text ? new Date() : null, pendingReasonUpdatedById: text ? causerId : null },
    include: { pendingReasonUpdatedBy: { select: { fullName: true, username: true } } }
  })

  logActivity({
    causerId,
    logName: 'maintenance-plans',
    event: 'updated',
    description: `updated pending reason ${detail.fleetUnit.unitNo} ${toIsoDateOnly(detail.planDate)}`,
    subjectType: 'MaintenancePlan',
    properties: { entityId: detail.maintenancePlanId, detailId, projectId: detail.maintenancePlan.projectId, projectCode: detail.maintenancePlan.projectId },
    attributeChanges: attributeChanges({ pendingReason: detail.pendingReason }, { pendingReason: text })
  })

  const by = updated.pendingReasonUpdatedBy

  return {
    ok: true,
    value: {
      detailId,
      text: updated.pendingReason,
      updatedAt: updated.pendingReasonUpdatedAt?.toISOString() ?? null,
      updatedBy: by ? by.fullName || by.username : null
    }
  }
}
