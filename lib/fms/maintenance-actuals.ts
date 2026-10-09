/**
 * Maintenance Actual — one execution of a plan date (unit + program + plan date).
 * Legacy rows may still point at a monthly quota with no plan detail.
 * Storage uses fleetUnitId (FleetUnitCache); API exposes fleetUnitId, unitId alias, and unitNo as unitCode.
 * Activity log: logName `maintenance-actuals` (subject id string → properties.entityId).
 */
import { MaintenanceActualStatus, MaintenanceQcStatus, Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import { attributeChanges, logActivity } from '@/lib/activity-log'
import { parseCreatedById } from '@/lib/fms/maintenance-plans'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'
import { HEAD_OFFICE_CODE, resolveProjectIdFilter } from '@/lib/utils/project-scope'

const QC_STATUSES = ['PASS', 'FAIL', 'NA'] as const
const SETTABLE_STATUSES = ['CLOSED', 'CANCELLED'] as const

const listInclude = {
  fleetUnit: { select: { unitNo: true } },
  createdBy: { select: { username: true } },
  pic: { select: { idUser: true, username: true, fullName: true } },
  maintenancePlan: {
    select: {
      projectId: true,
      year: true,
      month: true,
      maintenanceType: { select: { name: true } }
    }
  },
  maintenancePlanDetail: { select: { id: true, planDate: true } }
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
  pic: { select: { idUser: true, username: true, fullName: true } },
  maintenancePlan: {
    select: {
      id: true,
      projectId: true,
      year: true,
      month: true,
      maintenanceTypeId: true,
      maintenanceType: { select: { id: true, name: true } }
    }
  },
  maintenancePlanDetail: { select: { id: true, planDate: true } }
} satisfies Prisma.MaintenanceActualInclude

type ListActualRow = Prisma.MaintenanceActualGetPayload<{ include: typeof listInclude }>
type DetailActualRow = Prisma.MaintenanceActualGetPayload<{ include: typeof detailInclude }>

export type MaintenanceActualListDto = {
  id: string
  registerNo: string
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
  updatedAt: string
  status: string
  qcStatus: string | null
  picUserId: number | null
  picName: string | null
  closedAt: string | null
  maintenancePlanDetailId: string | null
  planDate: string | null
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
    registerNo: a.registerNo,
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
    updatedAt: a.updatedAt.toISOString(),
    status: a.status,
    qcStatus: a.qcStatus ?? null,
    picUserId: a.picUserId ?? null,
    picName: a.pic ? a.pic.fullName || a.pic.username : null,
    closedAt: a.closedAt?.toISOString() ?? null,
    maintenancePlanDetailId: a.maintenancePlanDetail?.id ?? a.maintenancePlanDetailId ?? null,
    planDate: toIsoDateOnly(a.maintenancePlanDetail?.planDate) ?? null,
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

/** yymm dari tanggal pelaksanaan, contoh 2026-09-08 → 2609. */
function registerPeriod(maintenanceDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(maintenanceDate.trim())
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null

  return `${match[1].slice(2)}${match[2]}`
}

/** Nomor berikutnya untuk satu site dan satu bulan. Seq tidak bergantung urutan teks. */
async function nextRegisterNo(
  db: Prisma.TransactionClient,
  projectCode: string,
  period: string
): Promise<string> {
  const prefix = `PM-${projectCode}.${period}-`

  const existing = await db.maintenanceActual.findMany({
    where: { registerNo: { startsWith: prefix } },
    select: { registerNo: true }
  })

  const highest = existing.reduce((max, row) => {
    const seq = Number(row.registerNo.slice(prefix.length))

    return Number.isInteger(seq) && seq > max ? seq : max
  }, 0)

  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}

/** Pratinjau nomor di form. Nomor yang tersimpan saat create yang berlaku. */
export async function previewRegisterNo(projectCode: string, maintenanceDate: string): Promise<string | null> {
  const period = registerPeriod(maintenanceDate)
  const code = projectCode.trim()
  if (!period || !code) return null

  return nextRegisterNo(prisma, code, period)
}

/** Kosong → null. Nilai di luar PASS/FAIL/NA → undefined (ditolak). */
function parseQcStatus(value: unknown): MaintenanceQcStatus | null | undefined {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const code = String(value).trim().toUpperCase()

  return (QC_STATUSES as readonly string[]).includes(code) ? (code as MaintenanceQcStatus) : undefined
}

/** PIC harus user aktif. Kosong → null. */
export async function resolvePicUserId(value: unknown): Promise<{ ok: true; id: number | null } | { ok: false }> {
  if (value === null || value === undefined || String(value).trim() === '') return { ok: true, id: null }
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return { ok: false }
  const user = await prisma.user.findFirst({ where: { idUser: id, isActive: true }, select: { idUser: true } })

  return user ? { ok: true, id } : { ok: false }
}

/** User aktif yang boleh dipilih sebagai PIC untuk site ini (termasuk Head Office). */
export async function listPicCandidates(projectCode: string) {
  const code = projectCode.trim()
  if (!code) return []

  return prisma.user.findMany({
    where: {
      isActive: true,
      userProjects: { some: { projectCode: { in: [code, HEAD_OFFICE_CODE] } } }
    },
    select: { idUser: true, username: true, fullName: true },
    orderBy: [{ fullName: 'asc' }, { username: 'asc' }]
  })
}

/** Satu actual per plan detail. Header bulan diisi dari detail itu. */
async function bindPlanDetail(detailId: string, exceptActualId?: string) {
  const detail = await prisma.maintenancePlanDetail.findUnique({
    where: { id: detailId },
    select: {
      id: true,
      fleetUnitId: true,
      maintenancePlanId: true,
      maintenancePlan: { select: { projectId: true } }
    }
  })
  if (!detail) {
    return { ok: false as const, status: 400, error: 'Plan date not found' }
  }

  const taken = await prisma.maintenanceActual.findFirst({
    where: {
      maintenancePlanDetailId: detail.id,
      ...(exceptActualId ? { id: { not: exceptActualId } } : {})
    },
    select: { id: true }
  })
  if (taken) {
    return { ok: false as const, status: 409, error: 'This plan date already has an actual' }
  }

  return { ok: true as const, detail }
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

export async function listMaintenanceActuals(session: Session, query: ListMaintenanceActualsQuery) {
  const where: Prisma.MaintenanceActualWhereInput = {}

  const planFilter: Prisma.MaintenancePlanWhereInput = {
    ...resolveProjectIdFilter(session, (query.projectId ?? query.projectCode)?.trim() || null)
  }

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
      { registerNo: { contains: search } },
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
    maintenancePlanDetailId?: string
    unitId?: unknown
    fleetUnitId?: unknown
    maintenanceDate?: string
    maintenanceTime?: string | null
    hourMeter?: unknown
    remarks?: string | null
    mechanics?: string | null
    qcStatus?: unknown
    picUserId?: unknown
    createdById?: unknown
  },
  sessionUserId: number
): Promise<
  | { ok: true; maintenanceActual: MaintenanceActualListDto }
  | { ok: false; status: number; error: string }
> {
  const {
    maintenancePlanDetailId,
    unitId,
    fleetUnitId,
    maintenanceDate,
    maintenanceTime,
    hourMeter,
    remarks,
    mechanics,
    qcStatus,
    picUserId,
    createdById
  } = body

  const qc = parseQcStatus(qcStatus)
  if (qc === undefined) {
    return { ok: false, status: 400, error: 'QC status must be PASS, FAIL, or NA' }
  }

  const pic = await resolvePicUserId(picUserId)
  if (!pic.ok) {
    return { ok: false, status: 400, error: 'PIC must be an active user' }
  }

  const detailId = maintenancePlanDetailId != null ? String(maintenancePlanDetailId).trim() : ''
  if (!detailId) {
    return { ok: false, status: 400, error: 'Select a plan date' }
  }

  const linked = await bindPlanDetail(detailId)
  if (!linked.ok) return linked

  const resolvedFleetUnitId = await resolveFleetUnitId(unitId, fleetUnitId)
  if (resolvedFleetUnitId && resolvedFleetUnitId !== linked.detail.fleetUnitId) {
    return { ok: false, status: 400, error: 'Unit must match the selected plan date' }
  }

  const mDate = maintenanceDate ? new Date(maintenanceDate) : null
  if (!mDate || Number.isNaN(mDate.getTime())) {
    return { ok: false, status: 400, error: 'maintenanceDate is required and must be valid' }
  }

  const hm = parseInt(String(hourMeter), 10)
  if (Number.isNaN(hm)) {
    return { ok: false, status: 400, error: 'hourMeter must be a number' }
  }

  const createdBy = parseCreatedById(createdById, sessionUserId)
  if (!createdBy) {
    return { ok: false, status: 400, error: 'createdById is required' }
  }

  const period = registerPeriod(String(maintenanceDate))
  const projectCode = linked.detail.maintenancePlan.projectId?.trim()
  if (!period || !projectCode) {
    return { ok: false, status: 400, error: 'Project code is required for the register number' }
  }

  const actualData = {
    maintenancePlanId: linked.detail.maintenancePlanId,
    maintenancePlanDetailId: linked.detail.id,
    fleetUnitId: linked.detail.fleetUnitId,
    maintenanceDate: mDate,
    maintenanceTime:
      maintenanceTime != null && String(maintenanceTime).trim() !== ''
        ? String(maintenanceTime).trim()
        : null,
    hourMeter: hm,
    remarks: remarks != null && String(remarks).trim() !== '' ? String(remarks).trim() : null,
    mechanics: mechanics != null && String(mechanics).trim() !== '' ? String(mechanics).trim() : null,
    status: MaintenanceActualStatus.CLOSED,
    closedAt: new Date(),
    qcStatus: qc,
    picUserId: pic.id,
    createdById: createdBy
  }

  try {
    let created: Prisma.MaintenanceActualGetPayload<{ include: typeof listInclude }> | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await prisma.$transaction(async tx => {
          const registerNo = await nextRegisterNo(tx, projectCode, period)

          return tx.maintenanceActual.create({
            data: { ...actualData, registerNo },
            include: listInclude
          })
        })
        break
      } catch (error) {
        const target = error instanceof Prisma.PrismaClientKnownRequestError ? String(error.meta?.target ?? '') : ''

        const registerClash =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          target.includes('register_no')
        if (registerClash && attempt < 2) continue
        throw error
      }
    }
    if (!created) {
      return { ok: false, status: 409, error: 'Could not allocate a register number' }
    }

    const mapped = mapActualList(created)
    logActivity({
      causerId: createdBy,
      logName: 'maintenance-actuals',
      event: 'created',
      description: `created maintenance actual ${mapped.registerNo}`,
      subjectType: 'MaintenanceActual',
      properties: {
        entityId: mapped.id,
        registerNo: mapped.registerNo,
        maintenancePlanId: mapped.maintenancePlanId,
        maintenancePlanDetailId: mapped.maintenancePlanDetailId,
        fleetUnitId: mapped.fleetUnitId,
        unitNo: mapped.unitNo,
        projectId: mapped.planProjectId,
        projectCode: mapped.planProjectId,
        planProjectId: mapped.planProjectId,
        planYear: mapped.planYear,
        planMonth: mapped.planMonth,
        planDate: mapped.planDate,
        planTypeName: mapped.planTypeName,
        maintenanceDate: mapped.maintenanceDate,
        hourMeter: mapped.hourMeter,
        status: mapped.status,
        qcStatus: mapped.qcStatus,
        picUserId: mapped.picUserId
      }
    })

    return { ok: true, maintenanceActual: mapped }
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
    maintenancePlanDetailId?: string | null
    unitId?: unknown
    fleetUnitId?: unknown
    maintenanceDate?: string
    maintenanceTime?: string | null
    hourMeter?: unknown
    remarks?: string | null
    mechanics?: string | null
    status?: unknown
    qcStatus?: unknown
    picUserId?: unknown
  },
  causerId?: number | null
): Promise<
  | { ok: true; item: MaintenanceActualListDto | MaintenanceActualDetailDto }
  | { ok: false; status: number; error: string }
> {
  const actual = await prisma.maintenanceActual.findUnique({
    where: { id },
    include: listInclude
  })
  if (!actual) {
    return { ok: false, status: 404, error: 'Maintenance actual not found' }
  }

  const existingMapped = mapActualList(actual)

  const {
    maintenancePlanId,
    maintenancePlanDetailId,
    unitId,
    fleetUnitId,
    maintenanceDate,
    maintenanceTime,
    hourMeter,
    remarks,
    mechanics,
    status,
    qcStatus,
    picUserId
  } = body

  const data: Prisma.MaintenanceActualUpdateInput = {}

  if (status !== undefined) {
    const next = String(status ?? '').trim().toUpperCase()
    if (!(SETTABLE_STATUSES as readonly string[]).includes(next)) {
      return { ok: false, status: 400, error: 'Status must be CLOSED or CANCELLED' }
    }
    if (next !== actual.status) {
      data.status = next as MaintenanceActualStatus
      data.closedAt = next === MaintenanceActualStatus.CLOSED ? new Date() : null
    }
  }

  if (qcStatus !== undefined) {
    const qc = parseQcStatus(qcStatus)
    if (qc === undefined) {
      return { ok: false, status: 400, error: 'QC status must be PASS, FAIL, or NA' }
    }
    data.qcStatus = qc
  }

  if (picUserId !== undefined) {
    const pic = await resolvePicUserId(picUserId)
    if (!pic.ok) {
      return { ok: false, status: 400, error: 'PIC must be an active user' }
    }
    data.pic = pic.id ? { connect: { idUser: pic.id } } : { disconnect: true }
  }

  const requestedDetailId =
    maintenancePlanDetailId != null ? String(maintenancePlanDetailId).trim() : ''

  if (requestedDetailId) {
    const linked = await bindPlanDetail(requestedDetailId, id)
    if (!linked.ok) return linked
    data.maintenancePlan = { connect: { id: linked.detail.maintenancePlanId } }
    data.maintenancePlanDetail = { connect: { id: linked.detail.id } }
    data.fleetUnit = { connect: { fleetUnitId: linked.detail.fleetUnitId } }
  } else if (maintenancePlanDetailId !== undefined && actual.maintenancePlanDetailId) {
    return { ok: false, status: 400, error: 'Select a plan date' }
  } else if (
    maintenancePlanId !== undefined &&
    String(maintenancePlanId).trim() !== actual.maintenancePlanId
  ) {
    return { ok: false, status: 400, error: 'Select a plan date' }
  } else if (!actual.maintenancePlanDetailId && (unitId !== undefined || fleetUnitId !== undefined)) {
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
    if (Number.isNaN(hm)) {
      return { ok: false, status: 400, error: 'hourMeter must be a number' }
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

  try {
    const updated = await prisma.maintenanceActual.update({
      where: { id },
      data,
      include: listInclude
    })

    const mapped = mapActualList(updated)
    logActivity({
      causerId: causerId ?? null,
      logName: 'maintenance-actuals',
      event: 'updated',
      description: `updated maintenance actual ${mapped.unitNo ?? mapped.fleetUnitId} — ${mapped.planTypeName ?? 'type'}`,
      subjectType: 'MaintenanceActual',
      properties: {
        entityId: mapped.id,
        maintenancePlanId: mapped.maintenancePlanId,
        maintenancePlanDetailId: mapped.maintenancePlanDetailId,
        fleetUnitId: mapped.fleetUnitId,
        unitNo: mapped.unitNo,
        projectId: mapped.planProjectId,
        projectCode: mapped.planProjectId,
        planProjectId: mapped.planProjectId,
        planYear: mapped.planYear,
        planMonth: mapped.planMonth,
        planDate: mapped.planDate,
        planTypeName: mapped.planTypeName,
        maintenanceDate: mapped.maintenanceDate,
        hourMeter: mapped.hourMeter
      },
      attributeChanges: attributeChanges(
        {
          maintenancePlanId: existingMapped.maintenancePlanId,
          maintenancePlanDetailId: existingMapped.maintenancePlanDetailId,
          fleetUnitId: existingMapped.fleetUnitId,
          maintenanceDate: existingMapped.maintenanceDate,
          maintenanceTime: existingMapped.maintenanceTime,
          hourMeter: existingMapped.hourMeter,
          remarks: existingMapped.remarks,
          mechanics: existingMapped.mechanics,
          status: existingMapped.status,
          qcStatus: existingMapped.qcStatus,
          picUserId: existingMapped.picUserId
        },
        {
          maintenancePlanId: mapped.maintenancePlanId,
          maintenancePlanDetailId: mapped.maintenancePlanDetailId,
          fleetUnitId: mapped.fleetUnitId,
          maintenanceDate: mapped.maintenanceDate,
          maintenanceTime: mapped.maintenanceTime,
          hourMeter: mapped.hourMeter,
          remarks: mapped.remarks,
          mechanics: mapped.mechanics,
          status: mapped.status,
          qcStatus: mapped.qcStatus,
          picUserId: mapped.picUserId
        }
      )
    })

    return { ok: true, item: mapped }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 400, error: 'Maintenance plan or unit not found' }
    }
    throw e
  }
}

export async function deleteMaintenanceActual(
  id: string,
  causerId?: number | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const existing = await prisma.maintenanceActual.findUnique({
    where: { id },
    include: listInclude
  })
  if (!existing) {
    return { ok: false, status: 404, error: 'Maintenance actual not found' }
  }

  const mapped = mapActualList(existing)

  try {
    await prisma.maintenanceActual.delete({ where: { id } })

    logActivity({
      causerId: causerId ?? null,
      logName: 'maintenance-actuals',
      event: 'deleted',
      description: `deleted maintenance actual ${mapped.unitNo ?? mapped.fleetUnitId}`,
      subjectType: 'MaintenanceActual',
      properties: {
        entityId: mapped.id,
        maintenancePlanId: mapped.maintenancePlanId,
        fleetUnitId: mapped.fleetUnitId,
        unitNo: mapped.unitNo,
        projectId: mapped.planProjectId,
        projectCode: mapped.planProjectId,
        planProjectId: mapped.planProjectId,
        planYear: mapped.planYear,
        planMonth: mapped.planMonth,
        planTypeName: mapped.planTypeName,
        maintenanceDate: mapped.maintenanceDate,
        hourMeter: mapped.hourMeter
      }
    })

    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, status: 404, error: 'Maintenance actual not found' }
    }
    throw e
  }
}
