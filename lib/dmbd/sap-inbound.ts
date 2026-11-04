/**
 * Map a SAP service call back onto a breakdown.
 * Remark stays local. A closed call supplies finish date, time, and resolution.
 */
import { collapseRepeatedName } from '@/lib/dmbd/employee-label'
import {
  clockToDate,
  isBreakdownPosition,
  resolutionText,
  sapClock,
  SERVICE_CALL_STATUS,
  type BreakdownPositionCode
} from '@/lib/dmbd/payload'
import { preparedByLabel } from '@/lib/dmbd/wo-header'

export type InboundNames = {
  operatorName?: string | null
  mechanicLeaderName?: string | null
  componentName?: string | null
  subComponentName?: string | null
  damageName?: string | null
  failureCauseName?: string | null
  jobCodeName?: string | null
  assigneeName?: string | null
  activityNames?: Record<string, string>
}

export type InboundHeader = {
  problem?: string
  hourMeter: number | null
  startedAt?: Date
  finishedAt: Date | null
  resolution: string | null
  workOrderStatus: 'OPEN' | 'CLOSE'
  jobCategory: string | null
  jobCode: string | null
  jobCodeName: string | null
  location: string | null
  operatorCode: string | null
  operatorName: string | null
  mechanicLeaderCode: string | null
  mechanicLeaderName: string | null
  componentCode: string | null
  componentName: string | null
  subComponentCode: string | null
  subComponentName: string | null
  damageCode: string | null
  damageName: string | null
  failureCauseCode: string | null
  failureCauseName: string | null
  preparedBy: string | null
  assigneeUserId: number | null
  assigneeName: string | null
  serialNo: string | null
}

export type InboundActivity = {
  sapActivityCode: number
  breakdownCode: string
  breakdownCodeName: string
  positionStatus: BreakdownPositionCode
  startedAt: Date
  endedAt: Date | null
  details: string
  technicianName: string | null
}

type Row = Record<string, unknown>

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function clip(value: string, max: number): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  return trimmed.slice(0, max)
}

/** Date portion of a Service Layer date or date-time. */
export function sapDatePart(value: unknown): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text(value))

  return match ? match[1] : null
}

function wallClock(dateValue: unknown, timeValue: unknown): Date | null {
  const day = sapDatePart(dateValue)
  if (!day) return null
  const clock = sapClock(day, text(timeValue) || '00:00')
  if (!clock) return null

  return clockToDate(clock)
}

function nullableCode(value: unknown, max: number): string | null {
  return clip(text(value), max)
}

/** Header and activities taken from one service call. Open calls clear the local finish. */
export function mapServiceCallInbound(
  call: Row,
  activities: Row[],
  names: InboundNames = {}
): { header: InboundHeader; activities: InboundActivity[] } {
  const status = Number(call.Status)
  const closed = status === SERVICE_CALL_STATUS.close
  const problem = text(call.Description) || text(call.Subject)
  const hourMeter = Number(call.U_MIS_HoursMeter)
  const startedAt = wallClock(call.U_MIS_MalStartDt, call.U_MIS_MalStartTm)
  const finishedAt = closed ? wallClock(call.U_MIS_EndWkDt, call.U_MIS_EndWkTm) ?? wallClock(call.ClosingDate, '00:00') : null
  const operatorCode = nullableCode(call.U_MIS_LastOpUse, 30)
  const mechanicCode = nullableCode(call.U_MIS_Mech1, 30)
  const componentCode = nullableCode(call.U_MIS_ComponentNo, 50)
  const subCode = nullableCode(call.U_MIS_SubCompNo, 30)
  const damageCode = nullableCode(call.U_MIS_Damage, 8)
  const causeCode = nullableCode(call.U_MIS_FailCause, 30)
  const jobCode = nullableCode(call.U_MIS_JobCode, 8)
  const assignee = Number(call.AssigneeCode)
  const assigneeUserId = Number.isInteger(assignee) && assignee > 0 ? assignee : null

  const header: InboundHeader = {
    ...(problem ? { problem: problem.slice(0, 4000) } : {}),
    hourMeter: Number.isFinite(hourMeter) ? hourMeter : null,
    ...(startedAt ? { startedAt } : {}),
    finishedAt: closed ? finishedAt : null,
    resolution: closed ? resolutionText(text(call.Resolution).slice(0, 254)) : null,
    workOrderStatus: closed ? 'CLOSE' : 'OPEN',
    jobCategory: nullableCode(call.U_MIS_JobCtg, 8),
    jobCode,
    jobCodeName: jobCode ? names.jobCodeName?.trim() || null : null,
    location: nullableCode(call.U_MIS_Location, 30),
    operatorCode,
    operatorName: operatorCode ? names.operatorName?.trim() || null : null,
    mechanicLeaderCode: mechanicCode,
    mechanicLeaderName: mechanicCode ? names.mechanicLeaderName?.trim() || null : null,
    componentCode,
    componentName: componentCode ? names.componentName?.trim() || null : null,
    subComponentCode: subCode,
    subComponentName: subCode ? names.subComponentName?.trim() || null : null,
    damageCode,
    damageName: damageCode ? names.damageName?.trim() || null : null,
    failureCauseCode: causeCode,
    failureCauseName: causeCode ? names.failureCauseName?.trim() || null : null,
    preparedBy: preparedByLabel(text(call.U_U_MIS_Prepared)) || null,
    assigneeUserId,
    assigneeName: assigneeUserId ? names.assigneeName?.trim() || null : null,
    serialNo: nullableCode(call.U_MIS_SerialNo, 100)
  }

  const mapped: InboundActivity[] = []
  for (const row of activities) {
    const sapActivityCode = Number(row.ActivityCode)
    const started = wallClock(row.StartDate, row.StartTime)
    const code = nullableCode(row.U_MIS_ActCode, 8)
    const position = text(row.U_U_MIS_StatPos)
    if (!Number.isInteger(sapActivityCode) || sapActivityCode <= 0 || !started || !code) continue
    if (!isBreakdownPosition(position)) continue

    const ended = wallClock(row.EndDueDate, row.EndTime)
    mapped.push({
      sapActivityCode,
      breakdownCode: code,
      breakdownCodeName: names.activityNames?.[code]?.trim() || code,
      positionStatus: position,
      startedAt: started,
      endedAt: ended && ended >= started ? ended : null,
      details: text(row.Details).slice(0, 4000),
      technicianName: collapseRepeatedName(text(row.U_MIS_Technician))?.slice(0, 30) ?? null
    })
  }

  return { header, activities: mapped }
}
