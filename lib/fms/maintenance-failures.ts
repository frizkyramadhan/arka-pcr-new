/**
 * Maintenance failure — one open defect per row.
 * occurred_at is the finding date, separate from created_at.
 * Frequency = 1 + follows. A later actual on the same unit adds one follow while closure_date is empty.
 * Progress does not stop the count. Closing does.
 */
import { Prisma } from '@prisma/client'

import { resolvePicUserId } from '@/lib/fms/maintenance-actuals'
import { SapB1DisabledError, SapB1UnavailableError } from '@/lib/sap-b1/config'
import { createSapFailureCodeLookup, FailureCodeNotFoundError, type ResolvedFailureCodes } from '@/lib/sap-b1/failure-codes'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'

const SEVERITIES = ['CRITICAL', 'MAJOR', 'MINOR'] as const

type Severity = (typeof SEVERITIES)[number]

export type FailureFollowInput = {
  failureId?: unknown
  progressed?: unknown
  closureDate?: unknown
}

export type FailureWriteInput = {
  failureId?: unknown
  clientKey?: unknown
  severity?: unknown
  description?: unknown
  componentCode?: unknown
  subComponentCode?: unknown
  damageCode?: unknown
  occurredAt?: unknown
  closureDate?: unknown
  picUserId?: unknown
}

type FailurePic = { idUser: number; username: string; fullName: string | null } | null

const picName = (pic: FailurePic) => (pic ? pic.fullName || pic.username : null)

const picSelect = { select: { idUser: true, username: true, fullName: true } } as const

export type UnitFailureDto = {
  id: string
  severity: string
  description: string
  sapFailureCode: string | null
  componentCode: string | null
  componentName: string | null
  subComponentCode: string | null
  subComponentName: string | null
  damageCode: string | null
  damageName: string | null
  occurredAt: string
  closureDate: string | null
  frequency: number
  picUserId: number | null
  picName: string | null
  progressed: boolean
  recordedOnThisActual: boolean
  countedOnThisActual: boolean
}

function parseSeverity(value: unknown): Severity | null {
  const text = String(value ?? '').trim().toUpperCase()
  if (SEVERITIES.includes(text as Severity)) return text as Severity

  return null
}

function parseClosureDate(value: unknown): Date | null | undefined {
  if (value == null || String(value).trim() === '') return null
  const text = String(value).trim().slice(0, 10)
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined
  }

  return date
}

function parseSapCodes(row: FailureWriteInput): { componentCode: string; subComponentCode: string; damageCode: string } | null {
  const componentCode = String(row.componentCode ?? '').trim()
  const subComponentCode = String(row.subComponentCode ?? '').trim()
  const damageCode = String(row.damageCode ?? '').trim()
  if (!componentCode || !subComponentCode || !damageCode) return null
  if ([componentCode, subComponentCode, damageCode].some(code => code.length > 50 || /['\\\r\n]/.test(code))) {
    return null
  }

  return { componentCode, subComponentCode, damageCode }
}

function mapFailure(
  row: {
    id: string
    severity: string
    description: string
    sapFailureCode: string | null
    componentCode: string | null
    componentName: string | null
    subComponentCode: string | null
    subComponentName: string | null
    damageCode: string | null
    damageName: string | null
    occurredAt: Date
    closureDate: Date | null
    maintenanceActualId: string | null
    picUserId: number | null
    pic: FailurePic
    _count: { follows: number }
    follows?: { progressed: boolean }[]
  },
  actualId?: string
): UnitFailureDto {
  return {
    id: row.id,
    severity: row.severity,
    description: row.description,
    sapFailureCode: row.sapFailureCode,
    componentCode: row.componentCode,
    componentName: row.componentName,
    subComponentCode: row.subComponentCode,
    subComponentName: row.subComponentName,
    damageCode: row.damageCode,
    damageName: row.damageName,
    occurredAt: toIsoDateOnly(row.occurredAt) ?? '',
    closureDate: toIsoDateOnly(row.closureDate),
    frequency: 1 + row._count.follows,
    picUserId: row.picUserId,
    picName: picName(row.pic),
    progressed: Boolean(row.follows?.[0]?.progressed),
    recordedOnThisActual: Boolean(actualId && row.maintenanceActualId === actualId),
    countedOnThisActual: Boolean(row.follows?.length)
  }
}

export type FailureListQuery = {
  projectId?: string
  fleetUnitId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export type FailureListDto = {
  id: string
  projectId: string
  fleetUnitId: number
  unitNo: string | null
  severity: string
  description: string
  sapFailureCode: string | null
  componentCode: string | null
  componentName: string | null
  subComponentCode: string | null
  subComponentName: string | null
  damageCode: string | null
  damageName: string | null
  occurredAt: string
  closureDate: string | null
  frequency: number
  picUserId: number | null
  picName: string | null
  maintenanceActualId: string | null
  registerNo: string | null
}

/** Semua temuan, untuk halaman list. Finding date = occurred_at. */
export async function listFailures(query: FailureListQuery) {
  const where: Prisma.MaintenanceFailureWhereInput = {}
  const projectId = query.projectId?.trim()
  if (projectId) where.projectId = projectId

  const fleetUnitId = Number(query.fleetUnitId)
  if (Number.isInteger(fleetUnitId) && fleetUnitId > 0) where.fleetUnitId = fleetUnitId

  if (query.status === 'open') where.closureDate = null
  if (query.status === 'closed') where.closureDate = { not: null }

  const dateFrom = parseClosureDate(query.dateFrom)
  const dateTo = parseClosureDate(query.dateTo)
  if (dateFrom || dateTo) {
    const end = dateTo ? new Date(dateTo) : null
    if (end) end.setUTCHours(23, 59, 59, 999)
    where.occurredAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(end ? { lte: end } : {})
    }
  }

  const rows = await prisma.maintenanceFailure.findMany({
    where,
    include: {
      fleetUnit: { select: { unitNo: true } },
      maintenanceActual: { select: { id: true, registerNo: true } },
      pic: picSelect,
      _count: { select: { follows: true } }
    },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }]
  })

  const failures: FailureListDto[] = rows.map(row => ({
    id: row.id,
    projectId: row.projectId,
    fleetUnitId: row.fleetUnitId,
    unitNo: row.fleetUnit?.unitNo ?? null,
    severity: row.severity,
    description: row.description,
    sapFailureCode: row.sapFailureCode,
    componentCode: row.componentCode,
    componentName: row.componentName,
    subComponentCode: row.subComponentCode,
    subComponentName: row.subComponentName,
    damageCode: row.damageCode,
    damageName: row.damageName,
    occurredAt: toIsoDateOnly(row.occurredAt) ?? '',
    closureDate: toIsoDateOnly(row.closureDate),
    frequency: 1 + row._count.follows,
    picUserId: row.picUserId,
    picName: picName(row.pic),
    maintenanceActualId: row.maintenanceActual?.id ?? row.maintenanceActualId,
    registerNo: row.maintenanceActual?.registerNo ?? null
  }))

  return { failures, total: failures.length }
}

/** Open findings on the unit, plus findings first recorded on this actual. */
export async function listUnitFailures(fleetUnitId: number, actualId?: string) {
  const rows = await prisma.maintenanceFailure.findMany({
    where: {
      fleetUnitId,
      OR: [{ closureDate: null }, ...(actualId ? [{ maintenanceActualId: actualId }] : [])]
    },
    include: {
      pic: picSelect,
      _count: { select: { follows: true } },
      ...(actualId
        ? { follows: { where: { maintenanceActualId: actualId }, select: { progressed: true } } }
        : {})
    },
    orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }]
  })

  const mapped = rows.map(row => mapFailure(row, actualId))

  return {
    openFailures: mapped.filter(row => !row.recordedOnThisActual && !row.closureDate),
    recordedHere: mapped.filter(row => row.recordedOnThisActual)
  }
}

/**
 * Record new findings on this actual, and one follow for every still-open finding from earlier actuals.
 */
export async function syncActualFailures(
  actualId: string,
  body: {
    follows?: FailureFollowInput[]
    recorded?: FailureWriteInput[]
    created?: FailureWriteInput[]
  },
  createdById: number
): Promise<{ ok: true; created: { clientKey: string; id: string }[] } | { ok: false; status: number; error: string }> {
  const actual = await prisma.maintenanceActual.findUnique({
    where: { id: actualId },
    include: { maintenancePlan: { select: { projectId: true } } }
  })
  if (!actual) return { ok: false, status: 404, error: 'Maintenance actual not found' }

  const projectId = actual.maintenancePlan?.projectId
  if (!projectId) return { ok: false, status: 400, error: 'Plan project is required' }

  const createdInput = Array.isArray(body.created) ? body.created : []
  const recordedInput = Array.isArray(body.recorded) ? body.recorded : []
  const followInput = Array.isArray(body.follows) ? body.follows : []

  for (const row of [...createdInput, ...recordedInput]) {
    if (!parseSeverity(row.severity)) {
      return { ok: false, status: 400, error: 'Severity must be Critical, Major, or Minor' }
    }
    if (!String(row.description ?? '').trim()) {
      return { ok: false, status: 400, error: 'Failure description is required' }
    }
    if (row.occurredAt != null && String(row.occurredAt).trim() !== '' && parseClosureDate(row.occurredAt) === undefined) {
      return { ok: false, status: 400, error: 'Finding date must be YYYY-MM-DD' }
    }
    if (row.closureDate != null && String(row.closureDate).trim() !== '' && parseClosureDate(row.closureDate) === undefined) {
      return { ok: false, status: 400, error: 'Closure date must be YYYY-MM-DD' }
    }
    if (!parseSapCodes(row)) {
      return { ok: false, status: 400, error: 'Component, sub component, and damage are required' }
    }
  }

  const createdPics: (number | null)[] = []
  const recordedPics: (number | null)[] = []
  for (const [input, pics] of [[createdInput, createdPics], [recordedInput, recordedPics]] as const) {
    for (const row of input) {
      const pic = await resolvePicUserId(row.picUserId)
      if (!pic.ok) return { ok: false, status: 400, error: 'Failure PIC must be an active user' }
      pics.push(pic.id)
    }
  }

  const created: { clientKey: string; id: string }[] = []

  try {
    const lookup = createSapFailureCodeLookup()
    const createdCodes: ResolvedFailureCodes[] = []
    for (const row of createdInput) {
      const codes = parseSapCodes(row)
      if (!codes) throw new Error('Component, sub component, and damage are required')
      createdCodes.push(await lookup.resolve(codes))
    }

    const recordedCodes: ResolvedFailureCodes[] = []
    for (const row of recordedInput) {
      const codes = parseSapCodes(row)
      if (!codes) throw new Error('Component, sub component, and damage are required')
      recordedCodes.push(await lookup.resolve(codes))
    }

    await prisma.$transaction(async tx => {
      for (let index = 0; index < createdInput.length; index += 1) {
        const row = createdInput[index]
        const codes = createdCodes[index]
        const severity = parseSeverity(row.severity) as Severity
        const closureDate = parseClosureDate(row.closureDate) ?? null
        const findingDate = parseClosureDate(row.occurredAt) ?? actual.maintenanceDate

        const failure = await tx.maintenanceFailure.create({
          data: {
            ...codes,
            projectId,
            fleetUnitId: actual.fleetUnitId,
            maintenanceActualId: actual.id,
            severity,
            description: String(row.description).trim(),
            occurredAt: findingDate,
            closureDate,
            operatingHours: new Prisma.Decimal(actual.hourMeter),
            picUserId: createdPics[index],
            createdById
          }
        })
        created.push({ clientKey: String(row.clientKey ?? failure.id), id: failure.id })
      }

      for (let index = 0; index < recordedInput.length; index += 1) {
        const row = recordedInput[index]
        const codes = recordedCodes[index]
        const failureId = String(row.failureId ?? '').trim()

        const existing = await tx.maintenanceFailure.findFirst({
          where: { id: failureId, maintenanceActualId: actual.id }
        })
        if (!existing) {
          throw new Error('A finding on this actual was not found')
        }
        const severity = parseSeverity(row.severity) as Severity
        const findingDate = parseClosureDate(row.occurredAt)
        await tx.maintenanceFailure.update({
          where: { id: existing.id },
          data: {
            severity,
            description: String(row.description).trim(),
            ...codes,
            ...(findingDate ? { occurredAt: findingDate } : {}),
            closureDate: parseClosureDate(row.closureDate) ?? null,
            operatingHours: new Prisma.Decimal(actual.hourMeter),
            picUserId: recordedPics[index]
          }
        })
      }

      const open = await tx.maintenanceFailure.findMany({
        where: {
          fleetUnitId: actual.fleetUnitId,
          closureDate: null,
          NOT: { maintenanceActualId: actual.id }
        },
        select: { id: true }
      })

      for (const failure of open) {
        const input = followInput.find(item => String(item.failureId ?? '') === failure.id)
        const closureDate = input ? parseClosureDate(input.closureDate) : null
        if (input && input.closureDate != null && String(input.closureDate).trim() !== '' && closureDate === undefined) {
          throw new Error('Closure date must be YYYY-MM-DD')
        }
        await tx.maintenanceFailureFollow.upsert({
          where: {
            maintenanceFailureId_maintenanceActualId: {
              maintenanceFailureId: failure.id,
              maintenanceActualId: actual.id
            }
          },
          create: {
            maintenanceFailureId: failure.id,
            maintenanceActualId: actual.id,
            progressed: Boolean(input?.progressed)
          },
          update: { progressed: Boolean(input?.progressed) }
        })
        if (closureDate) {
          await tx.maintenanceFailure.update({
            where: { id: failure.id },
            data: { closureDate }
          })
        }
      }
    })
  } catch (error) {
    if (error instanceof SapB1DisabledError) {
      return { ok: false, status: 503, error: 'SAP lookup is currently disabled.' }
    }
    if (error instanceof FailureCodeNotFoundError) {
      return { ok: false, status: 400, error: error.message }
    }
    if (error instanceof SapB1UnavailableError) {
      return { ok: false, status: 502, error: toFriendlySapErrorMessage(error, 'Failed to read SAP failure codes.') }
    }
    const message = error instanceof Error ? error.message : 'Failed to save failures'

    return { ok: false, status: 400, error: message }
  }

  return { ok: true, created }
}
