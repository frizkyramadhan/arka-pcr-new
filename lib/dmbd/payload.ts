/**
 * SAP payloads for a breakdown (service call) and its activities.
 * Date and time strings are the wall clock the user typed, not UTC.
 */

export const BREAKDOWN_POSITIONS = ['BD', 'OP', 'SB', 'AJ'] as const

export type BreakdownPositionCode = (typeof BREAKDOWN_POSITIONS)[number]

export const SERVICE_CALL_STATUS = {
  open: -3,
  close: -1,
  cancel: 1
} as const

const RESOLUTION_MAX = 254

export type SapClock = {
  date: string
  time: string
}

export type ServiceCallDraft = {
  cardCode: string
  series: number | null
  problem: string
  projectCode: string
  unitNo: string
  modelNo: string | null
  serialNo: string | null
  hourMeter: number | null

  /** Calendar date of created_at, not the breakdown start. */
  woDate: string
  jobCategory: string
  jobCode: string
  location: string
  operatorCode: string
  mechanicLeaderCode: string
  componentCode: string
  subComponentCode: string
  damageCode: string
  failureCauseCode: string
  preparedBy: string

  /** OUSR.USERID. Omitted when the work order has no assignee yet. */
  assignee: number | null
  position: BreakdownPositionCode
  started: SapClock
}

/** Series name is the calendar year plus the site number, e.g. 023C in 2026 → 2026-023. */
export function serviceCallSeriesName(projectCode: string, year: number): string | null {
  const digits = /^(\d{1,3})/.exec(projectCode.trim().toUpperCase())
  if (!digits || !Number.isInteger(year) || year < 2000 || year > 9999) return null

  return `${year}-${digits[1].padStart(3, '0')}`
}

/** Local calendar date, matching the wall clock stored on the breakdown. */
export function localDateOnly(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export type ActivityDraft = {
  cardCode: string
  serviceCallId: number
  workOrder: number
  activityCode: string
  activityName: string
  position: BreakdownPositionCode
  details: string
  started: SapClock
  ended: SapClock | null
  technicianName: string | null
  technicianQty: number | null
  handledBy: number | null
}

export function isBreakdownPosition(value: string): value is BreakdownPositionCode {
  return (BREAKDOWN_POSITIONS as readonly string[]).includes(value)
}

/** YYYY-MM-DD plus HH:mm or HH:mm:ss. */
export function sapClock(date: string, time: string): SapClock | null {
  const day = date.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null

  const raw = time.trim()
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw || '00:00')
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? '0')
  if (hours > 23 || minutes > 59 || seconds > 59) return null

  return {
    date: day,
    time: `${match[1]}:${match[2]}:${String(seconds).padStart(2, '0')}`
  }
}

/** Local Date from the same wall clock sent to SAP. */
export function clockToDate(clock: SapClock): Date | null {
  const value = new Date(`${clock.date}T${clock.time}`)

  return Number.isNaN(value.getTime()) ? null : value
}

export function resolutionText(value: string): string | null {
  const text = value.trim()
  if (!text) return null
  if (text.length > RESOLUTION_MAX) return null

  return text
}

/** Notes line used on existing activities: code, name, details, and the time span. */
export function activityNotes(input: {
  code: string
  name: string
  details: string
  started: SapClock
  ended: SapClock | null
}): string {
  const start = displayStamp(input.started)
  const end = input.ended ? displayStamp(input.ended) : ''
  const span = end ? `${start}- ${end}` : start

  return `${input.code}, ${input.name}, ${input.details}/ ${span}`
}

function displayStamp(clock: SapClock): string {
  const [year, month, day] = clock.date.split('-')

  return `${day}.${month}.${year} ${clock.time.slice(0, 5)}`
}

export function buildServiceCallBody(draft: ServiceCallDraft): Record<string, unknown> {
  const body: Record<string, unknown> = {
    // Customer name is filled by SAP from this card. The code depends on the company database.
    CustomerCode: draft.cardCode,
    Subject: draft.problem.slice(0, 254),
    Description: draft.problem,
    Status: SERVICE_CALL_STATUS.open,
    U_MIS_Project: draft.projectCode,
    U_MIS_UnitNo: draft.unitNo,
    U_MIS_MalStartDt: draft.started.date,
    U_MIS_MalStartTm: draft.started.time,
    U_MIS_WODate: draft.woDate,
    U_MIS_StartWkDt: draft.started.date,
    U_MIS_StartWkTm: draft.started.time,
    U_MIS_JobCtg: draft.jobCategory,
    U_MIS_JobCode: draft.jobCode,
    U_MIS_Location: draft.location,
    U_MIS_LastOpUse: draft.operatorCode,
    U_MIS_Mech1: draft.mechanicLeaderCode,
    U_MIS_ComponentNo: draft.componentCode,
    U_MIS_SubCompNo: draft.subComponentCode,
    U_MIS_Damage: draft.damageCode,
    U_MIS_FailCause: draft.failureCauseCode,
    U_U_MIS_Prepared: draft.preparedBy,
    U_MIS_StatPos: draft.position
  }

  if (draft.series) body.Series = draft.series
  if (draft.assignee) body.AssigneeCode = draft.assignee
  if (draft.modelNo) body.U_MIS_ModeNo = draft.modelNo
  if (draft.serialNo) body.U_MIS_SerialNo = draft.serialNo
  if (draft.hourMeter != null) body.U_MIS_HoursMeter = draft.hourMeter

  return body
}

export function buildActivityBody(draft: ActivityDraft): Record<string, unknown> {
  const body: Record<string, unknown> = {
    CardCode: draft.cardCode,
    ActivityDate: draft.started.date,
    ActivityTime: draft.started.time,
    StartDate: draft.started.date,
    StartTime: draft.started.time,
    Closed: 'tNO',
    Details: draft.details,
    Activity: 'cn_Conversation',
    ParentObjectId: draft.serviceCallId,
    ParentObjectType: '191',
    U_MIS_ActCode: draft.activityCode,
    U_MIS_ActCat: 'WO',
    U_MIS_WoNo: draft.workOrder,
    U_U_MIS_StatPos: draft.position,
    Notes: activityNotes({
      code: draft.activityCode,
      name: draft.activityName,
      details: draft.details,
      started: draft.started,
      ended: draft.ended
    })
  }

  if (draft.ended) {
    body.EndDueDate = draft.ended.date
    body.EndTime = draft.ended.time
  }
  if (draft.technicianName) body.U_MIS_Technician = draft.technicianName.slice(0, 30)
  if (draft.technicianQty != null) body.U_MIS_TeknisiQty = draft.technicianQty

  // Only a real SAP employee id belongs here. The breakdown flow leaves this empty and stores the PCR user locally.
  if (draft.handledBy != null) body.HandledBy = draft.handledBy

  return body
}

export type ServiceCallActivityLine = {
  LineNum: number
  ActivityCode: number
  U_MIS_TeknisiQty?: unknown
}

/**
 * Activity rows shown on the service-call Activities tab.
 * Returns null when the activity is already on the call.
 * Service Layer ignores ParentObjectId on the activity itself.
 */
export function appendServiceCallActivity(
  existing: Array<Record<string, unknown>>,
  activityCode: number
): ServiceCallActivityLine[] | null {
  if (existing.some(row => Number(row.ActivityCode) === activityCode)) return null

  const lines: ServiceCallActivityLine[] = []
  for (const row of existing) {
    const lineNum = Number(row.LineNum)
    const code = Number(row.ActivityCode)
    if (!Number.isInteger(lineNum) || lineNum < 0 || !Number.isInteger(code) || code <= 0) continue
    const line: ServiceCallActivityLine = { LineNum: lineNum, ActivityCode: code }
    if (row.U_MIS_TeknisiQty != null && row.U_MIS_TeknisiQty !== '') line.U_MIS_TeknisiQty = row.U_MIS_TeknisiQty
    lines.push(line)
  }

  const nextLine = lines.reduce((max, row) => Math.max(max, row.LineNum), -1) + 1
  lines.push({ LineNum: nextLine, ActivityCode: activityCode })

  return lines
}

export function buildCloseServiceCallBody(resolution: string, finished: SapClock): Record<string, unknown> {
  return {
    Status: SERVICE_CALL_STATUS.close,
    Resolution: resolution,
    ClosingDate: finished.date,
    ResolutionOnDate: finished.date,
    U_MIS_EndWkDt: finished.date,
    U_MIS_EndWkTm: finished.time
  }
}

export function buildCancelServiceCallBody(): Record<string, unknown> {
  return { Status: SERVICE_CALL_STATUS.cancel }
}

/** Patch BD start / start-work wall-clock on an existing service call. */
export function buildStartWorkPatch(started: SapClock): Record<string, unknown> {
  return {
    U_MIS_MalStartDt: started.date,
    U_MIS_MalStartTm: started.time,
    U_MIS_StartWkDt: started.date,
    U_MIS_StartWkTm: started.time
  }
}

export function buildPositionPatch(position: BreakdownPositionCode): Record<string, unknown> {
  return { U_MIS_StatPos: position }
}

/** Fields a planner can change after the work order already exists. WO date and start work stay as first saved. */
export function buildUpdateServiceCallBody(input: {
  problem: string
  hourMeter: number | null
  serialNo: string | null
  jobCategory: string
  jobCode: string
  location: string
  operatorCode: string
  mechanicLeaderCode: string
  componentCode: string
  subComponentCode: string
  damageCode: string
  failureCauseCode: string
  preparedBy: string
  assignee: number | null
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    Subject: input.problem.slice(0, 254),
    Description: input.problem,
    U_MIS_JobCtg: input.jobCategory,
    U_MIS_JobCode: input.jobCode,
    U_MIS_Location: input.location,
    U_MIS_LastOpUse: input.operatorCode,
    U_MIS_Mech1: input.mechanicLeaderCode,
    U_MIS_ComponentNo: input.componentCode,
    U_MIS_SubCompNo: input.subComponentCode,
    U_MIS_Damage: input.damageCode,
    U_MIS_FailCause: input.failureCauseCode,
    U_U_MIS_Prepared: input.preparedBy
  }

  if (input.serialNo) body.U_MIS_SerialNo = input.serialNo
  if (input.hourMeter != null) body.U_MIS_HoursMeter = input.hourMeter
  if (input.assignee) body.AssigneeCode = input.assignee

  return body
}
