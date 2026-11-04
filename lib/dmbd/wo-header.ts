/**
 * Work-order header checked against SAP lists before a breakdown is saved.
 * Service plan, kilo meter, HM change, department, and time sheet are not part of this header.
 */
export type WoCode = { code: string; name: string }

export type WoHeaderInput = {
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

  /** SAP user internal key (OUSR.USERID) chosen as the work-order assignee. */
  assigneeCode: string
}

export type WoCatalog = {
  jobCategories: WoCode[]
  jobCodes: Array<WoCode & { category: string }>
  locations: WoCode[]

  /** Full employee list, keyed by NIK. Role checks use operators and mechanics. */
  employees: WoCode[]

  /** Plant users at the project branch, keyed by OUSR internal key. */
  users: WoCode[]

  /** Active Production employees at the project branch, keyed by NIK. */
  operators: WoCode[]

  /** Active Plant mechanics at the project branch, keyed by NIK. */
  mechanics: WoCode[]
  components: WoCode[]
  subComponents: WoCode[]
  damages: WoCode[]
  causes: WoCode[]
}

export type ResolvedWoHeader = {
  jobCategory: string
  jobCode: string
  jobCodeName: string
  location: string
  operatorCode: string
  operatorName: string
  mechanicLeaderCode: string
  mechanicLeaderName: string
  componentCode: string
  componentName: string
  subComponentCode: string
  subComponentName: string
  damageCode: string
  damageName: string
  failureCauseCode: string
  failureCauseName: string
  preparedBy: string
  assigneeUserId: number | null
  assigneeName: string | null
  serialNo: string | null
}

/** OSCL.U_U_MIS_Prepared is 20 characters. The value is the employee name, clipped. */
export function preparedByLabel(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 20)
}

export function woHeaderFrom(body: {
  jobCategory?: unknown
  jobCode?: unknown
  location?: unknown
  operatorCode?: unknown
  mechanicLeaderCode?: unknown
  componentCode?: unknown
  subComponentCode?: unknown
  damageCode?: unknown
  failureCauseCode?: unknown
  preparedBy?: unknown
  assigneeCode?: unknown
}): WoHeaderInput {
  return {
    jobCategory: String(body.jobCategory ?? ''),
    jobCode: String(body.jobCode ?? ''),
    location: String(body.location ?? ''),
    operatorCode: String(body.operatorCode ?? ''),
    mechanicLeaderCode: String(body.mechanicLeaderCode ?? ''),
    componentCode: String(body.componentCode ?? ''),
    subComponentCode: String(body.subComponentCode ?? ''),
    damageCode: String(body.damageCode ?? ''),
    failureCauseCode: String(body.failureCauseCode ?? ''),
    preparedBy: String(body.preparedBy ?? ''),
    assigneeCode: String(body.assigneeCode ?? '')
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()

  return trimmed || null
}

/** Person text is optional. A blank value is stored as null; a long value is rejected. */
function optionalPerson(value: string, label: string): { code: string | null; name: string | null } | { error: string } {
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name) return { code: null, name: null }
  if (name.length > 100) return { error: `${label} is too long` }

  return { code: name.slice(0, 30), name }
}

export type LooseWoHeader = {
  jobCategory: string | null
  jobCode: string | null
  jobCodeName?: string | null
  location: string | null
  operatorCode: string | null
  operatorName: string | null
  mechanicLeaderCode: string | null
  mechanicLeaderName: string | null
  componentCode: string | null
  componentName?: string | null
  subComponentCode: string | null
  subComponentName?: string | null
  damageCode: string | null
  damageName?: string | null
  failureCauseCode: string | null
  failureCauseName?: string | null
  preparedBy: string | null
  assigneeUserId: number | null
  assigneeName?: string | null
}

/**
 * Header fields are optional when a SAP work order is not being created.
 * Names that come from the SAP catalog are cleared only when their code is empty,
 * so a later local save does not wipe a name that was resolved earlier.
 */
export function looseWoHeader(input: WoHeaderInput): { ok: true; data: LooseWoHeader } | { ok: false; error: string } {
  const operator = optionalPerson(input.operatorCode, 'Last operator')
  if ('error' in operator) return { ok: false, error: operator.error }

  const leader = optionalPerson(input.mechanicLeaderCode, 'Mechanic leader')
  if ('error' in leader) return { ok: false, error: leader.error }

  const jobCode = emptyToNull(input.jobCode)
  const componentCode = emptyToNull(input.componentCode)
  const subComponentCode = emptyToNull(input.subComponentCode)
  const damageCode = emptyToNull(input.damageCode)
  const failureCauseCode = emptyToNull(input.failureCauseCode)
  const assigneeUserId = optionalAssignee(input.assigneeCode ?? '')
  if (typeof assigneeUserId === 'string') return { ok: false, error: assigneeUserId }

  return {
    ok: true,
    data: {
      jobCategory: emptyToNull(input.jobCategory),
      jobCode,
      ...(jobCode ? {} : { jobCodeName: null }),
      location: emptyToNull(input.location),
      operatorCode: operator.code,
      operatorName: operator.name,
      mechanicLeaderCode: leader.code,
      mechanicLeaderName: leader.name,
      componentCode,
      ...(componentCode ? {} : { componentName: null }),
      subComponentCode,
      ...(subComponentCode ? {} : { subComponentName: null }),
      damageCode,
      ...(damageCode ? {} : { damageName: null }),
      failureCauseCode,
      ...(failureCauseCode ? {} : { failureCauseName: null }),
      preparedBy: preparedByLabel(input.preparedBy) || null,
      assigneeUserId,
      ...(assigneeUserId ? {} : { assigneeName: null })
    }
  }
}

/** Blank assignee is stored as null. A non-numeric value is rejected. */
function optionalAssignee(value: string): number | null | string {
  const trimmed = value.trim()
  if (!trimmed) return null
  const id = Number(trimmed)
  if (!Number.isInteger(id) || id <= 0) return 'Assignee was not found in SAP'

  return id
}

function findCode(rows: WoCode[], code: string): WoCode | null {
  const key = code.trim()
  if (!key) return null

  return rows.find(row => row.code === key) ?? null
}

export function resolveWoHeader(
  input: WoHeaderInput,
  catalog: WoCatalog,
  serialNo: string | null
): { ok: true; data: ResolvedWoHeader } | { ok: false; error: string } {
  const category = findCode(catalog.jobCategories, input.jobCategory)
  if (!category) return { ok: false, error: 'Job category was not found in SAP' }

  const job = catalog.jobCodes.find(
    row => row.code === input.jobCode.trim() && row.category === category.code
  )
  if (!job) return { ok: false, error: 'Job code does not belong to the selected job category' }

  const location = findCode(catalog.locations, input.location)
  if (!location) return { ok: false, error: 'Location was not found' }

  const operator = findCode(catalog.operators, input.operatorCode)
  if (!operator) return { ok: false, error: 'Last operator is not an active Production employee at this project' }

  const leader = findCode(catalog.mechanics, input.mechanicLeaderCode)
  if (!leader) return { ok: false, error: 'Mechanic leader is not an active Plant mechanic at this project' }

  const assignee = findCode(catalog.users, input.assigneeCode)
  if (!assignee) return { ok: false, error: 'Assignee is not a Plant user at this project' }

  const component = findCode(catalog.components, input.componentCode)
  if (!component) return { ok: false, error: 'Component code was not found in SAP' }

  const sub = findCode(catalog.subComponents, input.subComponentCode)
  if (!sub) return { ok: false, error: 'Sub component does not belong to the selected component' }

  const damage = findCode(catalog.damages, input.damageCode)
  if (!damage) return { ok: false, error: 'Damage was not found in SAP' }

  const cause = findCode(catalog.causes, input.failureCauseCode)
  if (!cause) return { ok: false, error: 'Failure cause was not found in SAP' }

  const prepared = preparedByLabel(input.preparedBy)
  if (!prepared) return { ok: false, error: 'Prepared by is required' }

  return {
    ok: true,
    data: {
      jobCategory: category.code,
      jobCode: job.code,
      jobCodeName: job.name,
      location: location.code,
      operatorCode: operator.code,
      operatorName: operator.name,
      mechanicLeaderCode: leader.code,
      mechanicLeaderName: leader.name,
      componentCode: component.code,
      componentName: component.name,
      subComponentCode: sub.code,
      subComponentName: sub.name,
      damageCode: damage.code,
      damageName: damage.name,
      failureCauseCode: cause.code,
      failureCauseName: cause.name,
      preparedBy: prepared,
      assigneeUserId: Number(assignee.code),
      assigneeName: assignee.name,
      serialNo: serialNo?.trim() || null
    }
  }
}
