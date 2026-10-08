/**
 * KPI targets — target value and colour rule per KPI, per site (project) and program (maintenance type).
 * '*' means all sites / all programs. A target applies from effective_from until a newer row for the same scope.
 * Dashboard cards call resolveKpiTarget() then kpiStatusColor() to colour the value.
 */
import { KpiDirection, Prisma } from '@prisma/client'

import { attributeChanges, createdAttributes, logActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'

/** Wildcard scope: every site or every program. */
export const ALL_SCOPE = '*'

/** KPIs a target can be set for (dashboard card codes), with the unit shown next to the value. */
export const KPI_DEFINITIONS = [
  { code: 'PM_COMPLIANCE', label: 'PM Compliance', unit: '%', direction: 'HIGHER' },
  { code: 'ON_TIME_COMPLIANCE', label: 'On-Time Compliance', unit: '%', direction: 'HIGHER' },
  { code: 'SCHEDULE_ADHERENCE', label: 'Schedule Adherence', unit: '%', direction: 'HIGHER' },
  { code: 'OVERDUE_MAINTENANCE', label: 'Overdue Maintenance', unit: '%', direction: 'LOWER' },
  { code: 'BACKLOG_GT30', label: 'Backlog > 30 days', unit: 'items', direction: 'COUNT_ZERO' },
  { code: 'CRITICAL_BACKLOG', label: 'Critical Backlog', unit: 'items', direction: 'COUNT_ZERO' },
  { code: 'QC_PASS_RATE', label: 'QC Pass Rate', unit: '%', direction: 'HIGHER' },
  { code: 'FAILURE_CLOSURE', label: 'Finding Closure', unit: '%', direction: 'HIGHER' },
  { code: 'CRITICAL_FAILURE', label: 'Critical Failure', unit: 'items', direction: 'COUNT_ZERO' },
  { code: 'REPEAT_FINDING', label: 'Repeat Finding', unit: '%', direction: 'LOWER' },
  { code: 'REPEAT_FAILURE', label: 'Repeat Failure', unit: '%', direction: 'LOWER' },
  { code: 'PA_AVAILABILITY', label: 'Physical Availability', unit: '%', direction: 'HIGHER' },
  { code: 'MTBF', label: 'MTBF', unit: 'hours', direction: 'HIGHER' },
  { code: 'MTTR', label: 'MTTR', unit: 'hours', direction: 'LOWER' }
] as const satisfies readonly { code: string; label: string; unit: string; direction: KpiDirection }[]

export type KpiCode = (typeof KPI_DEFINITIONS)[number]['code']

export type KpiColor = 'green' | 'yellow' | 'red'

const KPI_CODES = new Set<string>(KPI_DEFINITIONS.map(item => item.code))
const DIRECTIONS = Object.values(KpiDirection) as string[]

export type KpiTargetDto = {
  id: string
  kpiCode: string
  kpiLabel: string
  unit: string
  projectId: string
  maintenanceTypeId: string
  maintenanceTypeName: string | null
  targetValue: number
  direction: KpiDirection
  yellowMargin: number
  effectiveFrom: string
  updatedAt: string
}

export type KpiTargetInput = {
  kpiCode?: unknown
  projectId?: unknown
  maintenanceTypeId?: unknown
  targetValue?: unknown
  direction?: unknown
  yellowMargin?: unknown
  effectiveFrom?: unknown
}

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string }

type KpiTargetRow = {
  id: string
  kpiCode: string
  projectId: string
  maintenanceTypeId: string
  targetValue: Prisma.Decimal
  direction: KpiDirection
  yellowMargin: Prisma.Decimal
  effectiveFrom: Date
  updatedAt: Date
}

function mapRow(row: KpiTargetRow, typeNames: Map<string, string>): KpiTargetDto {
  const definition = KPI_DEFINITIONS.find(item => item.code === row.kpiCode)

  return {
    id: row.id,
    kpiCode: row.kpiCode,
    kpiLabel: definition?.label ?? row.kpiCode,
    unit: definition?.unit ?? '',
    projectId: row.projectId,
    maintenanceTypeId: row.maintenanceTypeId,
    maintenanceTypeName: row.maintenanceTypeId === ALL_SCOPE ? null : typeNames.get(row.maintenanceTypeId) ?? null,
    targetValue: Number(row.targetValue),
    direction: row.direction,
    yellowMargin: Number(row.yellowMargin),
    effectiveFrom: toIsoDateOnly(row.effectiveFrom) ?? '',
    updatedAt: row.updatedAt.toISOString()
  }
}

async function loadTypeNames() {
  const types = await prisma.maintenanceType.findMany({ select: { id: true, name: true } })

  return new Map(types.map(type => [type.id, type.name]))
}

function parseDate(value: unknown): Date | null {
  const match = String(value ?? '').trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null

  return date
}

function parseNumber(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)

  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null
}

/** Validate a full create/update body into Prisma data. */
async function parseInput(input: KpiTargetInput) {
  const kpiCode = String(input.kpiCode ?? '').trim().toUpperCase()
  if (!KPI_CODES.has(kpiCode)) return { ok: false as const, error: 'Unknown KPI' }

  const projectId = String(input.projectId ?? '').trim().toUpperCase() || ALL_SCOPE
  if (projectId.length > 10) return { ok: false as const, error: 'Site code is at most 10 characters' }

  const maintenanceTypeId = String(input.maintenanceTypeId ?? '').trim() || ALL_SCOPE
  if (maintenanceTypeId !== ALL_SCOPE) {
    const type = await prisma.maintenanceType.findUnique({ where: { id: maintenanceTypeId }, select: { id: true } })
    if (!type) return { ok: false as const, error: 'Maintenance type not found' }
  }

  const targetValue = parseNumber(input.targetValue)
  if (targetValue == null || targetValue < 0) return { ok: false as const, error: 'Target must be a number of 0 or more' }

  const direction = String(input.direction ?? '').trim().toUpperCase()
  if (!DIRECTIONS.includes(direction)) return { ok: false as const, error: 'Direction must be Higher, Lower, or Count zero' }

  const yellowMargin = parseNumber(input.yellowMargin) ?? 0
  if (yellowMargin < 0) return { ok: false as const, error: 'Yellow margin must be 0 or more' }

  const effectiveFrom = parseDate(input.effectiveFrom)
  if (!effectiveFrom) return { ok: false as const, error: 'Effective from must be YYYY-MM-DD' }

  return {
    ok: true as const,
    data: {
      kpiCode,
      projectId,
      maintenanceTypeId,
      targetValue: new Prisma.Decimal(targetValue),
      direction: direction as KpiDirection,
      yellowMargin: new Prisma.Decimal(yellowMargin),
      effectiveFrom
    }
  }
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

const CONFLICT_ERROR = 'A target for this KPI, site, program, and effective date already exists'

export async function listKpiTargets(query: { kpiCode?: string | null; projectId?: string | null }) {
  const where: Prisma.KpiTargetWhereInput = {}
  if (query.kpiCode) where.kpiCode = query.kpiCode
  if (query.projectId) where.projectId = query.projectId

  const [rows, typeNames] = await Promise.all([
    prisma.kpiTarget.findMany({
      where,
      orderBy: [{ kpiCode: 'asc' }, { projectId: 'asc' }, { maintenanceTypeId: 'asc' }, { effectiveFrom: 'desc' }]
    }),
    loadTypeNames()
  ])

  return {
    rows: rows.map(row => mapRow(row, typeNames)),
    total: rows.length,
    maintenanceTypes: [...typeNames].map(([id, name]) => ({ id, name }))
  }
}

export async function createKpiTarget(input: KpiTargetInput, causerId: number | null): Promise<Result<KpiTargetDto>> {
  const parsed = await parseInput(input)
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }

  try {
    const row = await prisma.kpiTarget.create({ data: parsed.data })
    logActivity({
      causerId,
      logName: 'kpi-targets',
      event: 'created',
      description: `created KPI target ${row.kpiCode} (${row.projectId}/${row.maintenanceTypeId})`,
      subjectType: 'KpiTarget',
      properties: { entityId: row.id },
      attributeChanges: createdAttributes(parsed.data)
    })

    return { ok: true, value: mapRow(row, await loadTypeNames()) }
  } catch (error) {
    if (isUniqueConflict(error)) return { ok: false, status: 409, error: CONFLICT_ERROR }
    throw error
  }
}

export async function updateKpiTarget(id: string, input: KpiTargetInput, causerId: number | null): Promise<Result<KpiTargetDto>> {
  const existing = await prisma.kpiTarget.findUnique({ where: { id } })
  if (!existing) return { ok: false, status: 404, error: 'KPI target not found' }

  const parsed = await parseInput(input)
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }

  try {
    const row = await prisma.kpiTarget.update({ where: { id }, data: parsed.data })
    logActivity({
      causerId,
      logName: 'kpi-targets',
      event: 'updated',
      description: `updated KPI target ${row.kpiCode} (${row.projectId}/${row.maintenanceTypeId})`,
      subjectType: 'KpiTarget',
      properties: { entityId: row.id },
      attributeChanges: attributeChanges(existing, row)
    })

    return { ok: true, value: mapRow(row, await loadTypeNames()) }
  } catch (error) {
    if (isUniqueConflict(error)) return { ok: false, status: 409, error: CONFLICT_ERROR }
    throw error
  }
}

export async function deleteKpiTarget(id: string, causerId: number | null): Promise<Result<{ id: string }>> {
  const existing = await prisma.kpiTarget.findUnique({ where: { id } })
  if (!existing) return { ok: false, status: 404, error: 'KPI target not found' }

  await prisma.kpiTarget.delete({ where: { id } })
  logActivity({
    causerId,
    logName: 'kpi-targets',
    event: 'deleted',
    description: `deleted KPI target ${existing.kpiCode} (${existing.projectId}/${existing.maintenanceTypeId})`,
    subjectType: 'KpiTarget',
    properties: { entityId: id },
    attributeChanges: { old: createdAttributes(existing).attributes, attributes: {} }
  })

  return { ok: true, value: { id } }
}

export type ResolvedKpiTarget = { targetValue: number; direction: KpiDirection; yellowMargin: number }

/**
 * Target that applies to a card. Most specific scope wins: site + program, site, program, then all.
 * Within a scope, the latest effective_from on or before periodEnd.
 */
export async function resolveKpiTarget(
  kpiCode: KpiCode,
  scope: { projectId?: string | null; maintenanceTypeId?: string | null; periodEnd: Date }
): Promise<ResolvedKpiTarget | null> {
  const projectId = scope.projectId?.trim() || ALL_SCOPE
  const maintenanceTypeId = scope.maintenanceTypeId?.trim() || ALL_SCOPE

  const rows = await prisma.kpiTarget.findMany({
    where: {
      kpiCode,
      projectId: { in: [...new Set([projectId, ALL_SCOPE])] },
      maintenanceTypeId: { in: [...new Set([maintenanceTypeId, ALL_SCOPE])] },
      effectiveFrom: { lte: scope.periodEnd }
    },
    orderBy: { effectiveFrom: 'desc' }
  })

  const rank = (row: KpiTargetRow) => (row.projectId !== ALL_SCOPE ? 2 : 0) + (row.maintenanceTypeId !== ALL_SCOPE ? 1 : 0)
  const best = rows.reduce<KpiTargetRow | null>((picked, row) => (!picked || rank(row) > rank(picked) ? row : picked), null)
  if (!best) return null

  return { targetValue: Number(best.targetValue), direction: best.direction, yellowMargin: Number(best.yellowMargin) }
}

/**
 * Card colour for a value (spec section 11).
 * HIGHER: green at or above target, yellow within margin below it, red beyond.
 * LOWER: green at or below target, yellow within margin above it, red beyond.
 * COUNT_ZERO: green at target (0), yellow up to target + margin (spec default margin 1), red more than that.
 */
export function kpiStatusColor(value: number | null | undefined, target: ResolvedKpiTarget | null): KpiColor | null {
  if (value == null || !Number.isFinite(value) || !target) return null
  const { targetValue, direction, yellowMargin } = target

  if (direction === 'HIGHER') {
    if (value >= targetValue) return 'green'

    return value >= targetValue - yellowMargin ? 'yellow' : 'red'
  }
  if (direction === 'LOWER') {
    if (value <= targetValue) return 'green'

    return value <= targetValue + yellowMargin ? 'yellow' : 'red'
  }
  if (value <= targetValue) return 'green'

  return value <= targetValue + yellowMargin ? 'yellow' : 'red'
}
