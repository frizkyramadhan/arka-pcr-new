/**
 * Maintenance Actual — per-unit realization linked to a plan (FMS parity).
 * Storage uses fleetUnitId (FleetUnitCache); API exposes fleetUnitId, unitId alias, and unitNo as unitCode.
 */
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

import { parseCreatedById } from '@/lib/fms/maintenance-plans'

const listInclude = {
  fleetUnit: { select: { unitNo: true } },
  createdBy: { select: { username: true } },
  maintenancePlan: {
    select: {
      projectId: true,
      year: true,
      month: true,
      maintenanceType: { select: { name: true } }
    }
  }
} satisfies Prisma.MaintenanceActualInclude

const detailInclude = {
  fleetUnit: {
    select: {
      fleetUnitId: true,
      unitNo: true,
      projectCode: true,
      modelName: true,
      description: true,
      manufacture: true,
      plantGroup: true,
      plantType: true,
      unitStatus: true
    }
  },
  createdBy: { select: { idUser: true, username: true } },
  maintenancePlan: {
    select: {
      id: true,
      projectId: true,
      year: true,
      month: true,
      maintenanceTypeId: true,
      maintenanceType: { select: { id: true, name: true } }
    }
  }
} satisfies Prisma.MaintenanceActualInclude

type ListActualRow = Prisma.MaintenanceActualGetPayload<{ include: typeof listInclude }>
type DetailActualRow = Prisma.MaintenanceActualGetPayload<{ include: typeof detailInclude }>

export type MaintenanceActualListDto = {
  id: string
  maintenancePlanId: string
  fleetUnitId: number
  unitId: string
  unitCode: string | null
  unitNo: string | null
  maintenanceDate: string | null
  maintenanceTime: string | null
  hourMeter: number
  remarks: string | null
  mechanics: string | null
  createdById: number
  createdByUsername: string | null
  createdAt: string
  planProjectId: string | null
  planYear: number | null
  planMonth: number | null
  planTypeName: string | null
}

export type MaintenanceActualDetailDto = MaintenanceActualListDto & {
  unitProjectName: string | null
  unitModel: string | null
  unitDescription: string | null
  unitManufacture: string | null
  unitPlantGroup: string | null
  unitPlantType: string | null
  unitStatus: string | null
  planMaintenanceTypeId: string | null
}

function mapActualList(a: ListActualRow): MaintenanceActualListDto {
  const fleetUnitId = a.fleetUnitId
  const unitNo = a.fleetUnit?.unitNo ?? null

  return {
    id: a.id,
    maintenancePlanId: a.maintenancePlanId,
    fleetUnitId,
    unitId: String(fleetUnitId),
    unitCode: unitNo,
    unitNo,
    maintenanceDate: a.maintenanceDate?.toISOString()?.slice(0, 10) ?? null,
    maintenanceTime: a.maintenanceTime ?? null,
    hourMeter: a.hourMeter,
    remarks: a.remarks ?? null,
    mechanics: a.mechanics ?? null,
    createdById: a.createdById,
    createdByUsername: a.createdBy?.username ?? null,
    createdAt: a.createdAt.toISOString(),
    planProjectId: a.maintenancePlan?.projectId ?? null,
    planYear: a.maintenancePlan?.year ?? null,
    planMonth: a.maintenancePlan?.month ?? null,
    planTypeName: a.maintenancePlan?.maintenanceType?.name ?? null
  }
}

function mapActualDetail(a: DetailActualRow): MaintenanceActualDetailDto {
  const base = mapActualList(a as unknown as ListActualRow)
  const u = a.fleetUnit

  return {
    ...base,
    unitProjectName: u?.projectCode ?? null,
    unitModel: u?.modelName ?? null,
    unitDescription: u?.description ?? null,
    unitManufacture: u?.manufacture ?? null,
    unitPlantGroup: u?.plantGroup ?? null,
    unitPlantType: u?.plantType ?? null,
    unitStatus: u?.unitStatus ?? null,
    planMaintenanceTypeId:
      a.maintenancePlan?.maintenanceType?.id ?? a.maintenancePlan?.maintenanceTypeId ?? null
  }
}

/** Resolve unitId or fleetUnitId from body/query to a FleetUnitCache primary key. */
export async function resolveFleetUnitId(
  unitId: unknown,
  fleetUnitId: unknown
): Promise<number | null> {
  const raw = fleetUnitId !== undefined && fleetUnitId !== null && String(fleetUnitId).trim() !== ''
    ? fleetUnitId
    : unitId

  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null
  }

  const id = Number(raw)
  if (Number.isNaN(id) || id <= 0) {
    return null
  }

  const unit = await prisma.fleetUnitCache.findUnique({ where: { fleetUnitId: id } })
  if (!unit) return null

  return id
}

export type ListMaintenanceActualsQuery = {
  projectId?: string
  projectCode?: string
  maintenanceTypeId?: string
  unitId?: string
  fleetUnitId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export async function listMaintenanceActuals(query: ListMaintenanceActualsQuery) {
  const where: Prisma.MaintenanceActualWhereInput = {}
  const planFilter: Prisma.MaintenancePlanWhereInput = {}

  const projectId = (query.projectId ?? query.projectCode)?.trim()
  if (projectId) planFilter.projectId = projectId

  const maintenanceTypeId = query.maintenanceTypeId?.trim()
  if (maintenanceTypeId) planFilter.maintenanceTypeId = maintenanceTypeId

  if (Object.keys(planFilter).length) {
    where.maintenancePlan = planFilter
  }

  const unitKey = query.fleetUnitId?.trim() || query.unitId?.trim()
  if (unitKey) {
    const fleetId = Number(unitKey)
    if (!Number.isNaN(fleetId) && fleetId > 0) {
      where.fleetUnitId = fleetId
    }
  }

  const dateFrom = query.dateFrom?.trim()
  if (dateFrom) {
    const d = new Date(dateFrom)
    if (!Number.isNaN(d.getTime())) {
      where.maintenanceDate = { ...(where.maintenanceDate as Prisma.DateTimeFilter | undefined), gte: d }
    }
  }

  const dateTo = query.dateTo?.trim()
  if (dateTo) {
    const d = new Date(dateTo)
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      where.maintenanceDate = { ...(where.maintenanceDate as Prisma.DateTimeFilter | undefined), lte: d }
    }
  }

  const search = query.search?.trim()
  if (search) {
    where.OR = [
      { remarks: { contains: search } },
      { mechanics: { contains: search } },
      { fleetUnit: { unitNo: { contains: search } } },
      { maintenancePlan: { projectId: { contains: search } } },
      { maintenancePlan: { maintenanceType: { name: { contains: search } } } }
    ]
  }

  const actuals = await prisma.maintenanceActual.findMany({
    where,
    include: listInclude,
    orderBy: [{ maintenanceDate: 'desc' }, { createdAt: 'desc' }]
  })

  const mapped = actuals.map(mapActualList)

  return {
    maintenanceActuals: mapped,
    allData: mapped,
    data: mapped,
    total: mapped.length
  }
}

export async function getMaintenanceActualById(id: string): Promise<MaintenanceActualDetailDto | null> {
  const actual = await prisma.maintenanceActual.findUnique({
    where: { id },
    include: detailInclude
  })
  if (!actual) return null

  return mapActualDetail(actual)
}

export async function createMaintenanceActual(
  body: {
    maintenancePlanId?: string
    unitId?: unknown
    fleetUnitId?: unknown
    maintenanceDate?: string
    maintenanceTime?: string | null
    hourMeter?: unknown
    remarks?: string | null
    mechanics?: string | null
    createdById?: unknown
  },
  sessionUserId: number
): Promise<
  | { ok: true; maintenanceActual: MaintenanceActualListDto }
  | { ok: false; status: number; error: string }
> {
  const {
    maintenancePlanId,
    unitId,
    fleetUnitId,
    maintenanceDate,
    maintenanceTime,
    hourMeter,
    remarks,
    mechanics,
    createdById
  } = body

  if (!maintenancePlanId || !String(maintenancePlanId).trim()) {
    return { ok: false, status: 400, error: 'maintenancePlanId is required' }
  }

  const resolvedFleetUnitId = await resolveFleetUnitId(unitId, fleetUnitId)
  if (!resolvedFleetUnitId) {
    return { ok: false, status: 400, error: 'unitId is required' }
  }

  const mDate = maintenanceDate ? new Date(maintenanceDate) : null
  if (!mDate || Number.isNaN(mDate.getTime())) {
    return { ok: false, status: 400, error: 'maintenanceDate is required and must be valid' }
  }

  const hm = parseInt(String(hourMeter), 10)
  if (Number.isNaN(hm) || hm < 0) {
    return { ok: false, status: 400, error: 'hourMeter must be a non-negative number' }
  }

  const createdBy = parseCreatedById(createdById, sessionUserId)
  if (!createdBy) {
    return { ok: false, status: 400, error: 'createdById is required' }
  }

  const planId = String(maintenancePlanId).trim()

  try {
    await prisma.maintenancePlan.findUniqueOrThrow({ where: { id: planId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 400, error: 'Maintenance plan or unit not found' }
    }
    throw e
  }

  try {
    const created = await prisma.maintenanceActual.create({
      data: {
        maintenancePlanId: planId,
        fleetUnitId: resolvedFleetUnitId,
        maintenanceDate: mDate,
        maintenanceTime:
          maintenanceTime != null && String(maintenanceTime).trim() !== ''
            ? String(maintenanceTime).trim()
            : null,
        hourMeter: hm,
        remarks: remarks != null && String(remarks).trim() !== '' ? String(remarks).trim() : null,
        mechanics:
          mechanics != null && String(mechanics).trim() !== '' ? String(mechanics).trim() : null,
        createdById: createdBy
      },
      include: listInclude
    })

    return { ok: true, maintenanceActual: mapActualList(created) }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 400, error: 'Maintenance plan or unit not found' }
    }
    throw e
  }
}

export async function updateMaintenanceActual(
  id: string,
  body: {
    maintenancePlanId?: string
    unitId?: unknown
    fleetUnitId?: unknown
    maintenanceDate?: string
    maintenanceTime?: string | null
    hourMeter?: unknown
    remarks?: string | null
    mechanics?: string | null
  }
): Promise<
  | { ok: true; item: MaintenanceActualListDto | MaintenanceActualDetailDto }
  | { ok: false; status: number; error: string }
> {
  const actual = await prisma.maintenanceActual.findUnique({ where: { id } })
  if (!actual) {
    return { ok: false, status: 404, error: 'Maintenance actual not found' }
  }

  const {
    maintenancePlanId,
    unitId,
    fleetUnitId,
    maintenanceDate,
    maintenanceTime,
    hourMeter,
    remarks,
    mechanics
  } = body

  const data: Prisma.MaintenanceActualUpdateInput = {}

  if (maintenancePlanId !== undefined) {
    if (!String(maintenancePlanId).trim()) {
      return { ok: false, status: 400, error: 'maintenancePlanId cannot be empty' }
    }
    data.maintenancePlan = { connect: { id: String(maintenancePlanId).trim() } }
  }

  if (unitId !== undefined || fleetUnitId !== undefined) {
    const resolved = await resolveFleetUnitId(unitId, fleetUnitId ?? unitId)
    if (!resolved) {
      return { ok: false, status: 400, error: 'unitId cannot be empty' }
    }
    data.fleetUnit = { connect: { fleetUnitId: resolved } }
  }

  if (maintenanceDate !== undefined) {
    const d = new Date(maintenanceDate)
    if (Number.isNaN(d.getTime())) {
      return { ok: false, status: 400, error: 'maintenanceDate must be valid' }
    }
    data.maintenanceDate = d
  }

  if (maintenanceTime !== undefined) {
    data.maintenanceTime =
      maintenanceTime != null && String(maintenanceTime).trim() !== ''
        ? String(maintenanceTime).trim()
        : null
  }

  if (hourMeter !== undefined) {
    const hm = parseInt(String(hourMeter), 10)
    if (Number.isNaN(hm) || hm < 0) {
      return { ok: false, status: 400, error: 'hourMeter must be non-negative' }
    }
    data.hourMeter = hm
  }

  if (remarks !== undefined) {
    data.remarks = remarks != null && String(remarks).trim() !== '' ? String(remarks).trim() : null
  }

  if (mechanics !== undefined) {
    data.mechanics =
      mechanics != null && String(mechanics).trim() !== '' ? String(mechanics).trim() : null
  }

  if (Object.keys(data).length === 0) {
    const current = await prisma.maintenanceActual.findUnique({ where: { id }, include: listInclude })
    if (!current) return { ok: false, status: 404, error: 'Maintenance actual not found' }

    return { ok: true, item: mapActualList(current) }
  }

  if (data.maintenancePlan) {
    const planId =
      maintenancePlanId !== undefined ? String(maintenancePlanId).trim() : actual.maintenancePlanId
    try {
      await prisma.maintenancePlan.findUniqueOrThrow({ where: { id: planId } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return { ok: false, status: 400, error: 'Maintenance plan or unit not found' }
      }
      throw e
    }
  }

  if (data.fleetUnit) {
    const resolved = await resolveFleetUnitId(unitId, fleetUnitId)
    if (!resolved) {
      return { ok: false, status: 400, error: 'Maintenance plan or unit not found' }
    }
  }

  try {
    const updated = await prisma.maintenanceActual.update({
      where: { id },
      data,
      include: listInclude
    })

    return { ok: true, item: mapActualList(updated) }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 400, error: 'Maintenance plan or unit not found' }
    }
    throw e
  }
}

export async function deleteMaintenanceActual(
  id: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  try {
    await prisma.maintenanceActual.delete({ where: { id } })

    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 404, error: 'Maintenance actual not found' }
    }
    throw e
  }
}
