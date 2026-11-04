/**
 * Breakdown lifecycle: at most one open BD-position episode per unit; open AJ may run in parallel.
 * Create/update WO is chosen per save (`issueWorkOrder`).
 * Rows without a SAP service call id stay local for add/edit/delete activity.
 * A linked service call gets activity writes and close (finish date, time, resolution).
 * Close requires every activity to have an end date/time.
 */
import type { Breakdown, BreakdownActivity, BreakdownPosition, Prisma } from '@prisma/client'

import { getSapB1ServiceCallSeriesYear } from '@/lib/sap-b1/config'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import {
  buildActivityBody,
  buildCloseServiceCallBody,
  buildPositionPatch,
  buildServiceCallBody,
  buildStartWorkPatch,
  buildUpdateServiceCallBody,
  clockToDate,
  isBreakdownPosition,
  localDateOnly,
  resolutionText,
  sapClock,
  serviceCallSeriesName,
  type BreakdownPositionCode,
  type SapClock
} from '@/lib/dmbd/payload'
import { isBreakdownRegisterClash } from '@/lib/dmbd/register-no'
import {
  looseWoHeader,
  resolveWoHeader,
  type LooseWoHeader,
  type ResolvedWoHeader,
  type WoCatalog,
  type WoHeaderInput
} from '@/lib/dmbd/wo-header'

export type BreakdownFailure = { ok: false; status: number; error: string }

export type BreakdownSuccess<T> = { ok: true; data: T }

export type BreakdownResult<T> = BreakdownSuccess<T> | BreakdownFailure

export type ActivityInput = {
  code: string
  position: string
  startedDate: string
  startedTime: string
  endedDate: string
  endedTime: string
  details: string
  technicianName: string
  technicianQty: string
  handledBy: string
}

export type CreateBreakdownInput = {
  fleetUnitId: number
  startedDate: string
  startedTime: string
  problem: string
  hourMeter: string
  remark: string

  /** When true, POST the service call and the first activity, then save locally. */
  issueWorkOrder?: boolean

  /** Existing SAP DocNum, kept when a new work order is not created. */
  workOrder?: string
  activity: ActivityInput
} & WoHeaderInput

type UnitRow = {
  fleetUnitId: number
  unitNo: string
  projectCode: string
  modelName: string | null
}

type SaveBreakdown = {
  id: string
}

export type BreakdownDeps = {
  loadUnit: (fleetUnitId: number) => Promise<UnitRow | null>

  /** Open breakdown whose latest activity position is BD (not AJ/OP/SB). */
  findOpenBdId: (fleetUnitId: number) => Promise<string | null>
  activityMaster: (code: string) => Promise<{ code: string; name: string } | null>
  componentName: (code: string) => Promise<string | null>
  cardCode: () => string
  seriesFor: (projectCode: string, year: number) => Promise<number | null>
  woCatalog: (componentCode: string, projectCode: string) => Promise<WoCatalog>
  unitSerial: (fleetUnitId: number) => Promise<string | null>
  issueServiceCall: (body: Record<string, unknown>) => Promise<{ serviceCallId: number; docNum: string }>
  issueActivity: (body: Record<string, unknown>) => Promise<number>
  patchCall: (serviceCallId: number, body: Record<string, unknown>) => Promise<void>
  cancelCall: (serviceCallId: number) => Promise<void>
  deactivate: (activityCode: number) => Promise<void>
  saveNew: (data: Prisma.BreakdownCreateInput) => Promise<SaveBreakdown>

  /** Allocate BD-{project}.{yymm}-{seq} for a new episode (startedAt wall-clock). */
  nextRegisterNo: (projectCode: string, startedAt: Date) => Promise<string>
  saveActivity: (data: Prisma.BreakdownActivityCreateInput) => Promise<void>
  updateActivity: (id: string, data: Prisma.BreakdownActivityUpdateInput) => Promise<void>
  removeActivity: (id: string) => Promise<void>
  patchActivity: (activityCode: number, body: Record<string, unknown>) => Promise<void>
  loadBreakdown: (id: string) => Promise<(Breakdown & { activities: BreakdownActivity[] }) | null>
  markClosed: (id: string, resolution: string, finishedAt: Date) => Promise<void>
  saveHeader: (
    id: string,
    data: {
      problem: string
      hourMeter: number | null
      remark: string | null
      workOrder?: string | null
      sapServiceCallId?: number | null
      serialNo?: string | null
      startedAt?: Date
    } & Partial<LooseWoHeader>
  ) => Promise<void>

  /** Mark episode cancelled (keep row; exclude from open/dashboard/PA). */
  markCancelled: (id: string, cancelledAt: Date) => Promise<void>

  /** Permanently remove breakdown (+ cascaded activities). */
  removeBreakdown: (id: string) => Promise<void>
}

async function resolveDeps(deps?: BreakdownDeps): Promise<BreakdownDeps> {
  if (deps) return deps

  const loaded = await import('@/lib/dmbd/breakdowns-db')

  return loaded.defaultBreakdownDeps
}

function fail(status: number, error: string): BreakdownFailure {
  return { ok: false, status, error }
}

/** Create with register_no; retry briefly if parallel creates clash on the unique key. */
async function saveNewWithRegister(
  deps: BreakdownDeps,
  projectCode: string,
  startedAt: Date,
  data: Omit<Prisma.BreakdownCreateInput, 'registerNo'>
): Promise<SaveBreakdown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const registerNo = await deps.nextRegisterNo(projectCode, startedAt)

      return await deps.saveNew({ ...data, registerNo })
    } catch (error) {
      if (isBreakdownRegisterClash(error) && attempt < 2) continue
      throw error
    }
  }

  throw new Error('Could not allocate a breakdown register number')
}

function sapError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'SAP request failed'

  return toFriendlySapErrorMessage(message, 'SAP could not save the breakdown.')
}

/** Digits only, matching the cannibal WO picker. Empty means no manual number. */
function manualWorkOrder(value: string | undefined): string | null | 'bad' {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length > 30) return 'bad'

  return digits
}

function optionalText(value: string, max: number): string | null {
  const text = value.trim()
  if (!text) return null
  if (text.length > max) return null

  return text
}

function optionalNumber(value: string): number | null | 'bad' {
  const text = value.trim()
  if (!text) return null
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0) return 'bad'

  return parsed
}

type ParsedActivity = {
  code: string
  position: BreakdownPositionCode
  started: SapClock
  startedAt: Date
  ended: SapClock | null
  endedAt: Date | null
  details: string
  technicianName: string | null
  technicianQty: number | null
  handledBy: number | null
}

function parseActivity(input: ActivityInput, fallbackDetails: string): ParsedActivity | BreakdownFailure {
  const code = input.code.trim()
  if (!code || code.length > 8) return fail(400, 'Activity code is required')
  if (!isBreakdownPosition(input.position)) return fail(400, 'Position must be BD, OP, SB, or AJ')

  const started = sapClock(input.startedDate, input.startedTime || '00:00')
  if (!started) return fail(400, 'Activity start date and time are invalid')
  const startedAt = clockToDate(started)
  if (!startedAt) return fail(400, 'Activity start date and time are invalid')

  const hasEnd = Boolean(input.endedDate.trim() || input.endedTime.trim())
  let ended: SapClock | null = null
  let endedAt: Date | null = null
  if (hasEnd) {
    ended = sapClock(input.endedDate || input.startedDate, input.endedTime || '00:00')
    if (!ended) return fail(400, 'Activity end date and time are invalid')
    endedAt = clockToDate(ended)
    if (!endedAt || endedAt < startedAt) return fail(400, 'Activity end is before the start')
  }

  const details = (input.details.trim() || fallbackDetails).trim()
  if (!details) return fail(400, 'Activity details are required')

  const technicianName = optionalText(input.technicianName, 30)
  if (input.technicianName.trim() && !technicianName) return fail(400, 'Technician name is too long')

  return {
    code,
    position: input.position,
    started,
    startedAt,
    ended,
    endedAt,
    details,
    technicianName,
    technicianQty: null,
    handledBy: null
  }
}

function activityUpdate(
  activity: ParsedActivity,
  masterName: string,
  sapActivityCode?: number | null
): Prisma.BreakdownActivityUpdateInput {
  return {
    breakdownCode: activity.code,
    breakdownCodeName: masterName,
    positionStatus: activity.position as BreakdownPosition,
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
    details: activity.details,
    technicianName: activity.technicianName,
    technicianQty: null,
    ...(sapActivityCode != null ? { sapActivityCode } : {})
  }
}

function activitySapBody(
  row: Breakdown,
  parsed: ParsedActivity,
  master: { code: string; name: string },
  cardCode: string,
  handledBy: number | null
) {
  return buildActivityBody({
    cardCode,
    serviceCallId: row.sapServiceCallId as number,
    workOrder: Number(row.workOrder),
    activityCode: master.code,
    activityName: master.name,
    position: parsed.position,
    details: parsed.details,
    started: parsed.started,
    ended: parsed.ended,
    technicianName: parsed.technicianName,
    technicianQty: parsed.technicianQty,
    handledBy
  })
}

function headerColumns(resolved: ResolvedWoHeader) {
  return {
    jobCategory: resolved.jobCategory,
    jobCode: resolved.jobCode,
    jobCodeName: resolved.jobCodeName,
    serialNo: resolved.serialNo,
    location: resolved.location,
    operatorName: resolved.operatorName,
    operatorCode: resolved.operatorCode,
    mechanicLeaderCode: resolved.mechanicLeaderCode,
    mechanicLeaderName: resolved.mechanicLeaderName,
    componentCode: resolved.componentCode,
    componentName: resolved.componentName,
    subComponentCode: resolved.subComponentCode,
    subComponentName: resolved.subComponentName,
    damageCode: resolved.damageCode,
    damageName: resolved.damageName,
    failureCauseCode: resolved.failureCauseCode,
    failureCauseName: resolved.failureCauseName,
    preparedBy: resolved.preparedBy,
    assigneeUserId: resolved.assigneeUserId,
    assigneeName: resolved.assigneeName
  }
}

async function resolveHeader(
  input: WoHeaderInput,
  fleetUnitId: number,
  projectCode: string,
  deps: BreakdownDeps
): Promise<BreakdownResult<ResolvedWoHeader>> {
  let catalog: WoCatalog
  try {
    catalog = await deps.woCatalog(input.componentCode.trim(), projectCode)
  } catch (error) {
    return fail(502, sapError(error))
  }

  let serialNo: string | null = null
  try {
    serialNo = await deps.unitSerial(fleetUnitId)
  } catch {
    serialNo = null
  }

  const resolved = resolveWoHeader(input, catalog, serialNo)
  if (!resolved.ok) return fail(400, resolved.error)

  return { ok: true, data: resolved.data }
}

function activityCreate(
  breakdownId: string,
  userId: number,
  activity: ParsedActivity,
  masterName: string,
  sapActivityCode: number | null
): Prisma.BreakdownActivityCreateInput {
  return {
    breakdown: { connect: { id: breakdownId } },
    sapActivityCode,
    activityCategory: 'WO',
    breakdownCode: activity.code,
    breakdownCodeName: masterName,
    positionStatus: activity.position as BreakdownPosition,
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
    details: activity.details,
    technicianName: activity.technicianName,
    technicianQty: null,
    handledBy: userId,
    createdBy: { connect: { idUser: userId } }
  }
}

export async function createBreakdown(
  input: CreateBreakdownInput,
  userId: number,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string }>> {
  deps = await resolveDeps(deps)
  const problem = input.problem.trim()
  if (!problem) return fail(400, 'Problem is required')
  if (!Number.isInteger(input.fleetUnitId) || input.fleetUnitId <= 0) return fail(400, 'Unit is required')

  const started = sapClock(input.startedDate, input.startedTime || '00:00')
  if (!started) return fail(400, 'Start date and time are invalid')
  const startedAt = clockToDate(started)
  if (!startedAt) return fail(400, 'Start date and time are invalid')

  const hourMeter = optionalNumber(input.hourMeter)
  if (hourMeter === 'bad') return fail(400, 'Hour meter is invalid')

  const remark = optionalText(input.remark, 200)
  if (input.remark.trim() && !remark) return fail(400, 'Remark is too long')

  const typedWorkOrder = manualWorkOrder(input.workOrder)
  if (typedWorkOrder === 'bad') return fail(400, 'Work order number is too long')

  const parsed = parseActivity(input.activity, problem)
  if ('ok' in parsed) return parsed

  const unit = await deps.loadUnit(input.fleetUnitId)
  if (!unit) return fail(400, 'Unit was not found')
  if (!canAccess(unit.projectCode)) return fail(403, 'You cannot record a breakdown for this project')

  // Only one open BD-position episode per unit; AJ (and OP/SB) opens may coexist.
  if (parsed.position === 'BD') {
    const openBdId = await deps.findOpenBdId(unit.fleetUnitId)
    if (openBdId) {
      return fail(
        409,
        'This unit already has an open BD-position breakdown. Use AJ (additional job) or close the BD first.'
      )
    }
  }

  const master = await deps.activityMaster(parsed.code)
  if (!master) return fail(400, 'Activity code was not found in SAP')

  const createdAt = new Date()

  if (!input.issueWorkOrder) {
    const loose = looseWoHeader(input)
    if (!loose.ok) return fail(400, loose.error)

    let serialNo: string | null = null
    try {
      serialNo = await deps.unitSerial(unit.fleetUnitId)
    } catch {
      serialNo = null
    }

    try {
      const saved = await saveNewWithRegister(deps, unit.projectCode, startedAt, {
        projectCode: unit.projectCode,
        fleetUnit: { connect: { fleetUnitId: unit.fleetUnitId } },
        startedAt,
        problem,
        hourMeter,
        remark,
        ...loose.data,
        serialNo,
        workOrder: typedWorkOrder,
        sapServiceCallId: null,
        workOrderStatus: 'OPEN',
        createdAt,
        createdBy: { connect: { idUser: userId } },
        activities: {
          create: {
            sapActivityCode: null,
            activityCategory: 'WO',
            breakdownCode: master.code,
            breakdownCodeName: master.name,
            positionStatus: parsed.position as BreakdownPosition,
            startedAt: parsed.startedAt,
            endedAt: parsed.endedAt,
            details: parsed.details,
            technicianName: parsed.technicianName,
            technicianQty: null,
            handledBy: userId,
            createdBy: { connect: { idUser: userId } }
          }
        }
      })

      return { ok: true, data: saved }
    } catch (error) {
      return fail(500, error instanceof Error ? error.message : 'Could not save the breakdown')
    }
  }

  let cardCode = ''
  try {
    cardCode = deps.cardCode()
  } catch (error) {
    return fail(500, sapError(error))
  }

  let series: number | null = null
  try {
    series = await deps.seriesFor(unit.projectCode, getSapB1ServiceCallSeriesYear(createdAt.getFullYear()))
  } catch (error) {
    return fail(502, sapError(error))
  }
  if (!series) {
    const seriesName = serviceCallSeriesName(unit.projectCode, getSapB1ServiceCallSeriesYear(createdAt.getFullYear()))

    return fail(400, `SAP series ${seriesName ?? 'for this project'} was not found`)
  }

  const header = await resolveHeader(input, unit.fleetUnitId, unit.projectCode, deps)
  if (!header.ok) return header
  const columns = headerColumns(header.data)

  const issued = await issueOrFail(() =>
    deps.issueServiceCall(
      buildServiceCallBody({
        cardCode,
        series,
        problem,
        projectCode: unit.projectCode,
        unitNo: unit.unitNo,
        modelNo: unit.modelName,
        serialNo: header.data.serialNo,
        hourMeter,
        woDate: localDateOnly(createdAt),
        jobCategory: header.data.jobCategory,
        jobCode: header.data.jobCode,
        location: header.data.location,
        operatorCode: header.data.operatorCode,
        mechanicLeaderCode: header.data.mechanicLeaderCode,
        componentCode: header.data.componentCode,
        subComponentCode: header.data.subComponentCode,
        damageCode: header.data.damageCode,
        failureCauseCode: header.data.failureCauseCode,
        preparedBy: header.data.preparedBy,
        assignee: header.data.assigneeUserId,
        position: parsed.position,
        started
      })
    )
  )
  if (!issued.ok) return issued

  const workOrderNumber = Number(issued.data.docNum)

  const activityCode = await issueOrFail(() =>
    deps.issueActivity(
      buildActivityBody({
        cardCode,
        serviceCallId: issued.data.serviceCallId,
        workOrder: workOrderNumber,
        activityCode: master.code,
        activityName: master.name,
        position: parsed.position,
        details: parsed.details,
        started: parsed.started,
        ended: parsed.ended,
        technicianName: parsed.technicianName,
        technicianQty: parsed.technicianQty,
        handledBy: parsed.handledBy
      })
    )
  )
  if (!activityCode.ok) {
    await deps.cancelCall(issued.data.serviceCallId).catch(() => undefined)

    return activityCode
  }

  try {
    const saved = await saveNewWithRegister(deps, unit.projectCode, startedAt, {
      projectCode: unit.projectCode,
      fleetUnit: { connect: { fleetUnitId: unit.fleetUnitId } },
      startedAt,
      problem,
      hourMeter,
      remark,
      ...columns,
      workOrder: issued.data.docNum,
      sapServiceCallId: issued.data.serviceCallId,
      workOrderStatus: 'OPEN',
      createdAt,
      createdBy: { connect: { idUser: userId } },
      activities: {
        create: {
          sapActivityCode: activityCode.data,
          activityCategory: 'WO',
          breakdownCode: master.code,
          breakdownCodeName: master.name,
          positionStatus: parsed.position as BreakdownPosition,
          startedAt: parsed.startedAt,
          endedAt: parsed.endedAt,
          details: parsed.details,
          technicianName: parsed.technicianName,
          technicianQty: null,
          handledBy: userId,
          createdBy: { connect: { idUser: userId } }
        }
      }
    })

    return { ok: true, data: saved }
  } catch (error) {
    await deps.cancelCall(issued.data.serviceCallId).catch(() => undefined)
    await deps.deactivate(activityCode.data).catch(() => undefined)

    return fail(500, error instanceof Error ? error.message : 'Could not save the breakdown')
  }
}

export async function addBreakdownActivity(
  breakdownId: string,
  input: ActivityInput,
  userId: number,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string }>> {
  deps = await resolveDeps(deps)
  const row = await deps.loadBreakdown(breakdownId)
  if (!row) return fail(404, 'Breakdown was not found')
  if (!canAccess(row.projectCode)) return fail(403, 'You cannot change this breakdown')
  if (row.finishedAt) return fail(409, 'This breakdown is already closed')
  if (row.cancelledAt) return fail(409, 'Cancelled breakdowns cannot be changed')

  const parsed = parseActivity(input, '')
  if ('ok' in parsed) return parsed

  const master = await deps.activityMaster(parsed.code)
  if (!master) return fail(400, 'Activity code was not found in SAP')

  const serviceCallId = row.sapServiceCallId
  if (serviceCallId == null) {
    try {
      await deps.saveActivity(activityCreate(row.id, userId, parsed, master.name, null))

      return { ok: true, data: { id: row.id } }
    } catch (error) {
      return fail(500, error instanceof Error ? error.message : 'Could not save the activity')
    }
  }

  let cardCode = ''
  try {
    cardCode = deps.cardCode()
  } catch (error) {
    return fail(500, sapError(error))
  }

  const activityCode = await issueOrFail(() =>
    deps.issueActivity(activitySapBody(row, parsed, master, cardCode, userId))
  )
  if (!activityCode.ok) return activityCode

  try {
    await deps.patchCall(serviceCallId, buildPositionPatch(parsed.position))
    await deps.saveActivity(activityCreate(row.id, userId, parsed, master.name, activityCode.data))

    return { ok: true, data: { id: row.id } }
  } catch (error) {
    await deps.deactivate(activityCode.data).catch(() => undefined)

    return fail(500, error instanceof Error ? error.message : 'Could not save the activity')
  }
}

async function openActivity(
  breakdownId: string,
  activityId: string,
  canAccess: (projectCode: string) => boolean,
  deps: BreakdownDeps
): Promise<BreakdownResult<{ row: Breakdown & { activities: BreakdownActivity[] }; activity: BreakdownActivity }>> {
  const row = await deps.loadBreakdown(breakdownId)
  if (!row) return fail(404, 'Breakdown was not found')
  if (!canAccess(row.projectCode)) return fail(403, 'You cannot change this breakdown')
  if (row.finishedAt) return fail(409, 'This breakdown is already closed')
  if (row.cancelledAt) return fail(409, 'Cancelled breakdowns cannot be changed')

  const activity = row.activities.find(item => item.id === activityId)
  if (!activity) return fail(404, 'Activity was not found')

  return { ok: true, data: { row, activity } }
}

/** Ubah satu activity. Handled by tetap user yang membuatnya. */
export async function updateBreakdownActivity(
  breakdownId: string,
  activityId: string,
  input: ActivityInput,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string }>> {
  deps = await resolveDeps(deps)
  const opened = await openActivity(breakdownId, activityId, canAccess, deps)
  if (!opened.ok) return opened

  const parsed = parseActivity(input, '')
  if ('ok' in parsed) return parsed

  const master = await deps.activityMaster(parsed.code)
  if (!master) return fail(400, 'Activity code was not found in SAP')

  const { row, activity } = opened.data
  let issuedCode: number | null = activity.sapActivityCode

  if (row.sapServiceCallId != null) {
    let cardCode = ''
    try {
      cardCode = deps.cardCode()
    } catch (error) {
      return fail(500, sapError(error))
    }

    const body = activitySapBody(row, parsed, master, cardCode, null)
    if (activity.sapActivityCode != null) {
      const patched = await issueOrFail(() => deps.patchActivity(activity.sapActivityCode as number, body))
      if (!patched.ok) return patched
    } else {
      const created = await issueOrFail(() => deps.issueActivity(body))
      if (!created.ok) return created
      issuedCode = created.data
    }

    const latest = latestActivity(
      row.activities.map(item => (item.id === activity.id ? { ...item, startedAt: parsed.startedAt } : item))
    )
    if (latest?.id === activity.id) {
      const position = await issueOrFail(() =>
        deps.patchCall(row.sapServiceCallId as number, buildPositionPatch(parsed.position))
      )
      if (!position.ok) {
        if (activity.sapActivityCode == null && issuedCode != null) {
          await deps.deactivate(issuedCode).catch(() => undefined)
        }

        return position
      }
    }
  }

  try {
    await deps.updateActivity(activity.id, activityUpdate(parsed, master.name, issuedCode))

    return { ok: true, data: { id: row.id } }
  } catch (error) {
    if (activity.sapActivityCode == null && issuedCode != null) {
      await deps.deactivate(issuedCode).catch(() => undefined)
    }

    return fail(500, error instanceof Error ? error.message : 'Could not save the activity')
  }
}

/** Hapus satu activity dari breakdown yang masih terbuka. */
export async function deleteBreakdownActivity(
  breakdownId: string,
  activityId: string,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string }>> {
  deps = await resolveDeps(deps)
  const opened = await openActivity(breakdownId, activityId, canAccess, deps)
  if (!opened.ok) return opened

  const { row, activity } = opened.data
  if (activity.sapActivityCode != null) {
    const deactivated = await issueOrFail(() => deps.deactivate(activity.sapActivityCode as number))
    if (!deactivated.ok) return deactivated

    const latest = latestActivity(row.activities.filter(item => item.id !== activity.id))
    if (latest && row.sapServiceCallId != null && isBreakdownPosition(latest.positionStatus)) {
      const position = await issueOrFail(() =>
        deps.patchCall(row.sapServiceCallId as number, buildPositionPatch(latest.positionStatus))
      )
      if (!position.ok) return position
    }
  }

  try {
    await deps.removeActivity(activity.id)

    return { ok: true, data: { id: row.id } }
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : 'Could not delete the activity')
  }
}

export async function closeBreakdown(
  breakdownId: string,
  resolutionInput: string,
  finishedDate: string,
  finishedTime: string,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string }>> {
  deps = await resolveDeps(deps)
  const row = await deps.loadBreakdown(breakdownId)
  if (!row) return fail(404, 'Breakdown was not found')
  if (!canAccess(row.projectCode)) return fail(403, 'You cannot change this breakdown')
  if (row.finishedAt) return fail(409, 'This breakdown is already closed')
  if (row.cancelledAt) return fail(409, 'Cancelled breakdowns cannot be closed')
  if (!row.workOrder) return fail(400, 'A work order number is required before this breakdown can be closed')

  const unfinished = row.activities.filter(activity => !activity.endedAt)
  if (unfinished.length) {
    return fail(400, 'Finish every activity (end date and time) before closing this breakdown')
  }

  const resolution = resolutionText(resolutionInput)
  if (!resolution) return fail(400, 'Resolution is required and must be 254 characters or fewer')

  const finished = sapClock(finishedDate, finishedTime || '00:00')
  if (!finished) return fail(400, 'Finish date and time are invalid')
  const finishedAt = clockToDate(finished)
  if (!finishedAt || finishedAt < row.startedAt) return fail(400, 'Finish is before the breakdown start')

  if (row.sapServiceCallId != null) {
    const patched = await issueOrFail(() =>
      deps.patchCall(row.sapServiceCallId as number, buildCloseServiceCallBody(resolution, finished))
    )
    if (!patched.ok) return patched
  }

  try {
    await deps.markClosed(row.id, resolution, finishedAt)

    return { ok: true, data: { id: row.id } }
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : 'Could not save the closed breakdown')
  }
}

export type UpdateBreakdownInput = {
  problem: string
  hourMeter: string
  remark: string

  /** Wall-clock BD start — editable while the episode is still open. */
  startedDate?: string
  startedTime?: string

  /** When true, create a work order if this row has none, or patch the existing one. */
  issueWorkOrder?: boolean

  /** Existing SAP DocNum, kept when a new work order is not created. */
  workOrder?: string
} & WoHeaderInput

export async function updateBreakdown(
  breakdownId: string,
  input: UpdateBreakdownInput,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string }>> {
  deps = await resolveDeps(deps)
  const row = await deps.loadBreakdown(breakdownId)
  if (!row) return fail(404, 'Breakdown was not found')
  if (!canAccess(row.projectCode)) return fail(403, 'You cannot change this breakdown')
  if (row.finishedAt) return fail(409, 'This breakdown is already closed')
  if (row.cancelledAt) return fail(409, 'Cancelled breakdowns cannot be edited')

  const problem = input.problem.trim()
  if (!problem) return fail(400, 'Problem is required')

  const hourMeter = optionalNumber(input.hourMeter)
  if (hourMeter === 'bad') return fail(400, 'Hour meter is invalid')

  const remark = optionalText(input.remark, 200)
  if (input.remark.trim() && !remark) return fail(400, 'Remark is too long')

  const typedWorkOrder = manualWorkOrder(input.workOrder)
  if (typedWorkOrder === 'bad') return fail(400, 'Work order number is too long')

  const wantStart =
    input.startedDate != null && String(input.startedDate).trim() !== ''
      ? sapClock(String(input.startedDate), String(input.startedTime || '00:00'))
      : null
  if (input.startedDate != null && String(input.startedDate).trim() !== '' && !wantStart) {
    return fail(400, 'Start date and time are invalid')
  }
  const startedAt = wantStart ? clockToDate(wantStart) : null
  if (wantStart && !startedAt) return fail(400, 'Start date and time are invalid')
  const startChanged = Boolean(startedAt && startedAt.getTime() !== row.startedAt.getTime())

  const loose = looseWoHeader(input)
  if (!loose.ok) return fail(400, loose.error)

  const header = input.issueWorkOrder ? await resolveHeader(input, row.fleetUnitId, row.projectCode, deps) : null
  if (header && !header.ok) return header
  const resolved = header && header.ok ? header.data : null
  const columns = resolved ? headerColumns(resolved) : loose.data

  let issued: { serviceCallId: number; docNum: string; activityId: string | null; activityCode: number | null } | null =
    null

  if (input.issueWorkOrder && row.sapServiceCallId != null && resolved) {
    const patched = await issueOrFail(() =>
      deps.patchCall(
        row.sapServiceCallId as number,
        {
          ...buildUpdateServiceCallBody({
            problem,
            hourMeter,
            serialNo: resolved.serialNo,
            jobCategory: resolved.jobCategory,
            jobCode: resolved.jobCode,
            location: resolved.location,
            operatorCode: resolved.operatorCode,
            mechanicLeaderCode: resolved.mechanicLeaderCode,
            componentCode: resolved.componentCode,
            subComponentCode: resolved.subComponentCode,
            damageCode: resolved.damageCode,
            failureCauseCode: resolved.failureCauseCode,
            preparedBy: resolved.preparedBy,
            assignee: resolved.assigneeUserId
          }),
          ...(startChanged && wantStart ? buildStartWorkPatch(wantStart) : {})
        }
      )
    )
    if (!patched.ok) return patched
  } else if (startChanged && wantStart && row.sapServiceCallId != null) {
    const patched = await issueOrFail(() => deps.patchCall(row.sapServiceCallId as number, buildStartWorkPatch(wantStart)))
    if (!patched.ok) return patched
  }

  if (input.issueWorkOrder && row.sapServiceCallId == null && resolved) {
    const created = await issueExistingWorkOrder(row, { problem, hourMeter, header: resolved }, deps)
    if (!created.ok) return created
    issued = created.data
  }

  const oldStartMs = row.startedAt?.getTime?.() ?? null

  const syncActivities =
    startChanged && startedAt && oldStartMs != null
      ? row.activities.filter(activity => activity.startedAt.getTime() === oldStartMs)
      : []

  try {
    await deps.saveHeader(row.id, {
      problem,
      hourMeter,
      remark,
      ...columns,
      ...(startedAt ? { startedAt } : {}),
      ...(issued
        ? { workOrder: issued.docNum, sapServiceCallId: issued.serviceCallId }
        : input.issueWorkOrder
          ? {}
          : { workOrder: typedWorkOrder })
    })
    if (issued?.activityId && issued.activityCode != null) {
      await deps.updateActivity(issued.activityId, { sapActivityCode: issued.activityCode })
    }
    if (startedAt) {
      for (const activity of syncActivities) {
        await deps.updateActivity(activity.id, { startedAt })
        if (activity.sapActivityCode != null && wantStart) {
          await issueOrFail(() =>
            deps.patchActivity(activity.sapActivityCode as number, {
              ActivityDate: wantStart.date,
              ActivityTime: wantStart.time,
              StartDate: wantStart.date,
              StartTime: wantStart.time
            })
          )
        }
      }
    }

    return { ok: true, data: { id: row.id } }
  } catch (error) {
    if (issued) {
      await deps.cancelCall(issued.serviceCallId).catch(() => undefined)
      if (issued.activityCode != null) await deps.deactivate(issued.activityCode).catch(() => undefined)
    }

    return fail(500, error instanceof Error ? error.message : 'Could not save the breakdown')
  }
}

/**
 * Cancel open breakdown: deactivate SAP activities, cancel service call, set cancelledAt.
 * Row is kept for audit; cancelled episodes are excluded from open BD / dashboard / PA.
 * Closed (RFU) episodes cannot be cancelled.
 */
export async function cancelBreakdown(
  breakdownId: string,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string; cancelledSap: boolean }>> {
  deps = await resolveDeps(deps)
  const row = await deps.loadBreakdown(breakdownId)
  if (!row) return fail(404, 'Breakdown was not found')
  if (!canAccess(row.projectCode)) return fail(403, 'You cannot cancel this breakdown')
  if (row.finishedAt) return fail(409, 'Closed breakdowns cannot be cancelled')
  if (row.cancelledAt) return fail(409, 'This breakdown is already cancelled')

  let cancelledSap = false

  for (const activity of row.activities) {
    if (activity.sapActivityCode == null) continue
    const deactivated = await issueOrFail(() => deps.deactivate(activity.sapActivityCode as number))
    if (!deactivated.ok) return deactivated
    cancelledSap = true
  }

  if (row.sapServiceCallId != null) {
    const cancelled = await issueOrFail(() => deps.cancelCall(row.sapServiceCallId as number))
    if (!cancelled.ok) return cancelled
    cancelledSap = true
  }

  try {
    await deps.markCancelled(row.id, new Date())

    return { ok: true, data: { id: row.id, cancelledSap } }
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : 'Could not cancel the breakdown')
  }
}

/**
 * Permanently delete a breakdown. Open linked SAP WO/activities are cancelled first.
 * Finished or already-cancelled rows are deleted locally only (SAP already closed/cancelled).
 */
export async function deleteBreakdown(
  breakdownId: string,
  canAccess: (projectCode: string) => boolean,
  deps?: BreakdownDeps
): Promise<BreakdownResult<{ id: string; cancelledSap: boolean }>> {
  deps = await resolveDeps(deps)
  const row = await deps.loadBreakdown(breakdownId)
  if (!row) return fail(404, 'Breakdown was not found')
  if (!canAccess(row.projectCode)) return fail(403, 'You cannot delete this breakdown')

  let cancelledSap = false
  const stillOpen = !row.finishedAt && !row.cancelledAt

  if (stillOpen) {
    for (const activity of row.activities) {
      if (activity.sapActivityCode == null) continue
      const deactivated = await issueOrFail(() => deps.deactivate(activity.sapActivityCode as number))
      if (!deactivated.ok) return deactivated
      cancelledSap = true
    }

    if (row.sapServiceCallId != null) {
      const cancelled = await issueOrFail(() => deps.cancelCall(row.sapServiceCallId as number))
      if (!cancelled.ok) return cancelled
      cancelledSap = true
    }
  }

  try {
    await deps.removeBreakdown(row.id)

    return { ok: true, data: { id: row.id, cancelledSap } }
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : 'Could not delete the breakdown')
  }
}

/** Create the SAP work order for a breakdown that was saved locally first. */
async function issueExistingWorkOrder(
  row: Breakdown & { activities: BreakdownActivity[] },
  input: { problem: string; hourMeter: number | null; header: ResolvedWoHeader },
  deps: BreakdownDeps
): Promise<BreakdownResult<{ serviceCallId: number; docNum: string; activityId: string | null; activityCode: number | null }>> {
  const unit = await deps.loadUnit(row.fleetUnitId)
  if (!unit) return fail(400, 'Unit was not found')

  const started = clockFromDate(row.startedAt)
  const createdAt = new Date()
  const first = [...row.activities].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0] ?? null
  const latest = latestActivity(row.activities)
  const rawPosition = latest?.positionStatus ?? 'BD'
  const position = isBreakdownPosition(rawPosition) ? rawPosition : 'BD'

  let cardCode = ''
  try {
    cardCode = deps.cardCode()
  } catch (error) {
    return fail(500, sapError(error))
  }

  let series: number | null = null
  try {
    series = await deps.seriesFor(unit.projectCode, getSapB1ServiceCallSeriesYear(createdAt.getFullYear()))
  } catch (error) {
    return fail(502, sapError(error))
  }
  if (!series) {
    const seriesName = serviceCallSeriesName(unit.projectCode, getSapB1ServiceCallSeriesYear(createdAt.getFullYear()))

    return fail(400, `SAP series ${seriesName ?? 'for this project'} was not found`)
  }

  const issued = await issueOrFail(() =>
    deps.issueServiceCall(
      buildServiceCallBody({
        cardCode,
        series,
        problem: input.problem,
        projectCode: unit.projectCode,
        unitNo: unit.unitNo,
        modelNo: unit.modelName,
        serialNo: input.header.serialNo,
        hourMeter: input.hourMeter,
        woDate: localDateOnly(createdAt),
        jobCategory: input.header.jobCategory,
        jobCode: input.header.jobCode,
        location: input.header.location,
        operatorCode: input.header.operatorCode,
        mechanicLeaderCode: input.header.mechanicLeaderCode,
        componentCode: input.header.componentCode,
        subComponentCode: input.header.subComponentCode,
        damageCode: input.header.damageCode,
        failureCauseCode: input.header.failureCauseCode,
        preparedBy: input.header.preparedBy,
        assignee: input.header.assigneeUserId,
        position,
        started
      })
    )
  )
  if (!issued.ok) return issued

  if (!first) {
    return {
      ok: true,
      data: { serviceCallId: issued.data.serviceCallId, docNum: issued.data.docNum, activityId: null, activityCode: null }
    }
  }

  const activityStarted = clockFromDate(first.startedAt)
  const activityEnded = first.endedAt ? clockFromDate(first.endedAt) : null

  const activityCode = await issueOrFail(() =>
    deps.issueActivity(
      buildActivityBody({
        cardCode,
        serviceCallId: issued.data.serviceCallId,
        workOrder: Number(issued.data.docNum),
        activityCode: first.breakdownCode,
        activityName: first.breakdownCodeName,
        position: isBreakdownPosition(first.positionStatus) ? first.positionStatus : 'BD',
        details: first.details ?? input.problem,
        started: activityStarted,
        ended: activityEnded,
        technicianName: first.technicianName,
        technicianQty: first.technicianQty == null ? null : Number(first.technicianQty),
        handledBy: null
      })
    )
  )
  if (!activityCode.ok) {
    await deps.cancelCall(issued.data.serviceCallId).catch(() => undefined)

    return activityCode
  }

  return {
    ok: true,
    data: {
      serviceCallId: issued.data.serviceCallId,
      docNum: issued.data.docNum,
      activityId: first.id,
      activityCode: activityCode.data
    }
  }
}

function clockFromDate(date: Date): SapClock {
  const pad = (value: number) => String(value).padStart(2, '0')

  return {
    date: localDateOnly(date),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }
}

async function issueOrFail<T>(run: () => Promise<T>): Promise<BreakdownResult<T>> {
  try {
    return { ok: true, data: await run() }
  } catch (error) {
    return fail(502, sapError(error))
  }
}

/** Status unit seperti di laporan harian: RFU bila selesai, selain itu posisi activity terakhir. */
export function statusUnitFor(
  finishedAt: Date | null,
  latestPosition: string | null,
  cancelledAt: Date | null = null
): string {
  if (cancelledAt) return 'CANCEL'
  if (finishedAt) return 'RFU'

  return latestPosition ?? 'BD'
}

/** Jam downtime. Baris terbuka dihitung sampai sekarang; jangan pakai rumus Excel yang membaca finish kosong sebagai tahun 0. */
export function downtimeHoursFor(startedAt: Date, finishedAt: Date | null, now: Date = new Date()): number {
  const end = finishedAt ?? now
  const hours = (end.getTime() - startedAt.getTime()) / 3600000

  return Math.max(0, Math.round(hours * 10) / 10)
}

export function latestActivity<T extends { startedAt: Date; createdAt: Date }>(rows: T[]): T | null {
  if (rows.length === 0) return null

  return [...rows].sort((a, b) => {
    const byStart = b.startedAt.getTime() - a.startedAt.getTime()
    if (byStart !== 0) return byStart

    return b.createdAt.getTime() - a.createdAt.getTime()
  })[0]
}

/** Latest activity position on an open episode; missing activities count as BD. */
export function episodePositionStatus(
  activities: { startedAt: Date; createdAt: Date; positionStatus: string }[]
): string {
  return latestActivity(activities)?.positionStatus ?? 'BD'
}

/** True when the open episode’s latest activity is still BD (mayor downtime). */
export function isOpenBdPositionEpisode(
  activities: { startedAt: Date; createdAt: Date; positionStatus: string }[]
): boolean {
  return episodePositionStatus(activities) === 'BD'
}
