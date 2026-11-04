/**
 * Writes a breakdown's work order and activities through SAP Service Layer.
 * Reading activity codes stays on the MIS_ACTIVITY master.
 */
import { listFailureComponents } from '@/lib/sap-b1/failure-codes'
import {
  getSapB1ServiceCallCardCode,
  getSapB1ServiceCallSeries,
  SapB1ConfigError
} from '@/lib/sap-b1/config'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'
import { employeeDisplayName } from '@/lib/dmbd/employee-label'
import { appendServiceCallActivity, buildCancelServiceCallBody, serviceCallSeriesName } from '@/lib/dmbd/payload'

type Row = Record<string, unknown>

export type IssuedServiceCall = {
  serviceCallId: number
  docNum: string
}

export function serviceCallCardCode(): string {
  const code = getSapB1ServiceCallCardCode()
  if (!code) {
    throw new SapB1ConfigError('SAP_B1_SERVICE_CALL_CARD_CODE is not set')
  }

  return code
}

export function serviceCallSeries(): number | null {
  return getSapB1ServiceCallSeries()
}

export async function createServiceCall(body: Record<string, unknown>): Promise<IssuedServiceCall> {
  const row = await sapB1AuthorizedJson<Row>('/ServiceCalls', { method: 'POST', body })
  const serviceCallId = Number(row.ServiceCallID)
  const docNum = Number(row.DocNum)
  if (!Number.isInteger(serviceCallId) || serviceCallId <= 0 || !Number.isFinite(docNum)) {
    throw new Error('SAP did not return a service call id and document number')
  }

  return { serviceCallId, docNum: String(docNum) }
}

export async function createActivity(body: Record<string, unknown>): Promise<number> {
  const serviceCallId = Number(body.ParentObjectId)
  const row = await sapB1AuthorizedJson<Row>('/Activities', { method: 'POST', body })
  const activityCode = Number(row.ActivityCode)
  if (!Number.isInteger(activityCode) || activityCode <= 0) {
    throw new Error('SAP did not return an activity code')
  }

  // POST leaves ParentObjectId empty, so the service-call Activities tab stays blank until this link.
  if (Number.isInteger(serviceCallId) && serviceCallId > 0 && Number(row.ParentObjectId) !== serviceCallId) {
    try {
      await linkActivityToServiceCall(serviceCallId, activityCode)
    } catch (error) {
      await deactivateActivity(activityCode).catch(() => undefined)
      throw error
    }
  }

  return activityCode
}

/** Put the activity on ServiceCallActivities. That write also sets the activity parent to the service call. */
async function linkActivityToServiceCall(serviceCallId: number, activityCode: number): Promise<void> {
  const call = await sapB1AuthorizedJson<{ ServiceCallActivities?: Row[] }>(
    `/ServiceCalls(${serviceCallId})?$select=ServiceCallActivities`
  )
  const lines = appendServiceCallActivity(call.ServiceCallActivities ?? [], activityCode)
  if (!lines) return

  await sapB1AuthorizedJson(`/ServiceCalls(${serviceCallId})`, {
    method: 'PATCH',
    body: { ServiceCallActivities: lines }
  })
}

export async function patchServiceCall(serviceCallId: number, body: Record<string, unknown>): Promise<void> {
  await sapB1AuthorizedJson(`/ServiceCalls(${serviceCallId})`, { method: 'PATCH', body })
}

export async function cancelServiceCall(serviceCallId: number): Promise<void> {
  await patchServiceCall(serviceCallId, buildCancelServiceCallBody())
}

export async function patchActivity(activityCode: number, body: Record<string, unknown>): Promise<void> {
  await sapB1AuthorizedJson(`/Activities(${activityCode})`, { method: 'PATCH', body })
}

export async function deactivateActivity(activityCode: number): Promise<void> {
  await sapB1AuthorizedJson(`/Activities(${activityCode})`, {
    method: 'PATCH',
    body: { InactiveFlag: 'tYES', Closed: 'tYES' }
  })
}

export async function findActivityMaster(code: string): Promise<{ code: string; name: string } | null> {
  const key = encodeURIComponent(code.trim().replace(/'/g, "''"))
  try {
    const row = await sapB1AuthorizedJson<Row>(`/MIS_ACTIVITY('${key}')`)
    if (String(row.Canceled ?? '').toUpperCase() === 'Y') return null
    if (String(row.U_MIS_Status ?? 'Y').toUpperCase() === 'N') return null

    const activityCode = String(row.U_MIS_ActCode ?? row.Code ?? '').trim()
    const name = String(row.U_MIS_ActName ?? row.Name ?? '').trim()
    if (!activityCode) return null

    return { code: activityCode, name: name || activityCode }
  } catch {
    return null
  }
}

export async function listActivityMasters(): Promise<Array<{ code: string; name: string }>> {
  const payload = await sapB1AuthorizedJson<{ value?: Row[] }>('/MIS_ACTIVITY?$top=100')

  return (payload.value ?? [])
    .filter(row => String(row.Canceled ?? '').toUpperCase() !== 'Y')
    .filter(row => String(row.U_MIS_Status ?? 'Y').toUpperCase() !== 'N')
    .map(row => ({
      code: String(row.U_MIS_ActCode ?? row.Code ?? '').trim(),
      name: String(row.U_MIS_ActName ?? row.Name ?? '').trim()
    }))
    .filter(row => row.code)
}

export async function findComponentName(code: string): Promise<string | null> {
  const rows = await listFailureComponents()
  const found = rows.find(row => row.code === code.trim())

  return found?.name ?? null
}

/** Location has no SAP value list. These are the values stored on live service calls. */
export const BREAKDOWN_LOCATIONS = [
  { code: 'Workshop', name: 'Workshop' },
  { code: 'Field', name: 'Field' }
]

type CodeRow = { code: string; name: string }

function activeRow(row: Row): boolean {
  if (String(row.Canceled ?? '').toUpperCase() === 'Y') return false
  const status = String(row.U_MIS_Status ?? 'Y').trim().toUpperCase()

  return status === '' || status === 'Y'
}

async function readPages(path: string, take = 100, max = 800): Promise<Row[]> {
  const rows: Row[] = []
  for (let skip = 0; skip < max; skip += take) {
    const joiner = path.includes('?') ? '&' : '?'
    const payload = await sapB1AuthorizedJson<{ value?: Row[] }>(`${path}${joiner}$top=${take}&$skip=${skip}`)
    const value = payload.value ?? []
    rows.push(...value)
    if (value.length < take) break
  }

  return rows
}

export async function listJobCategories(): Promise<CodeRow[]> {
  const rows = await readPages(
    '/MIS_JOBCATEGORY?$select=Code,Canceled,U_MIS_CategoryCode,U_MIS_CategoryName',
    20,
    40
  )

  return rows
    .filter(row => String(row.Canceled ?? '').toUpperCase() !== 'Y')
    .map(row => ({
      code: String(row.U_MIS_CategoryCode ?? row.Code ?? '').trim(),
      name: String(row.U_MIS_CategoryName ?? row.Name ?? '').trim()
    }))
    .filter(row => row.code)
}

export async function listJobCodes(): Promise<Array<CodeRow & { category: string }>> {
  const rows = await readPages(
    '/MIS_JOBCODE?$select=Code,Canceled,U_MIS_JobCode,U_MIS_JobDesc,U_MIS_CategoryCode,U_MIS_Status'
  )
  const seen = new Set<string>()
  const result: Array<CodeRow & { category: string }> = []
  for (const row of rows.filter(activeRow)) {
    const category = String(row.U_MIS_CategoryCode ?? '').trim()
    const code = String(row.U_MIS_JobCode ?? '').trim()
    const key = `${category}:${code}`
    if (!category || !code || seen.has(key)) continue
    seen.add(key)
    result.push({
      code,
      category,
      name: String(row.U_MIS_JobDesc ?? row.Name ?? code).trim()
    })
  }

  return result
}

export async function listFailureCauses(): Promise<CodeRow[]> {
  const rows = await readPages('/MIS_CAUSE?$select=Code,Canceled,U_MIS_CauseCd,U_MIS_CauseNm,U_MIS_Status')

  return rows.filter(activeRow).map(row => ({
    code: String(row.U_MIS_CauseCd ?? row.Code ?? '').trim(),
    name: String(row.U_MIS_CauseNm ?? row.Name ?? '').trim()
  })).filter(row => row.code)
}

function mapUser(row: Row): CodeRow {
  const code = String(row.InternalKey ?? '').trim()
  const userCode = String(row.UserCode ?? '').trim()
  const userName = String(row.UserName ?? '').trim()
  if (!code || code === '0' || userCode.toLowerCase() === 'b1i') return { code: '', name: '' }

  return { code, name: userName ? `${userName} · ${userCode}` : userCode }
}

/** SAP users (OUSR). ServiceCalls.AssigneeCode stores InternalKey, not the user code. */
export async function listUsers(): Promise<CodeRow[]> {
  const rows = await readPages('/Users?$select=InternalKey,UserCode,UserName', 100, 800)

  return rows.map(mapUser).filter(row => row.code)
}

/** Employees identified by NIK (OHEM.U_MIS_NIK), the value stored on a service call. */
export async function listEmployees(): Promise<CodeRow[]> {
  const rows = await readPages(
    '/EmployeesInfo?$select=EmployeeID,FirstName,LastName,U_MIS_NIK',
    100,
    800
  )

  return rows
    .map(row => {
      const code = String(row.U_MIS_NIK ?? '').trim()

      const name = employeeDisplayName(row.FirstName, row.LastName)

      return { code, name: name || code }
    })
    .filter(row => row.code)
}

function odataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/** Employee display names for NIKs. Missing NIKs are omitted. */
export async function lookupEmployeeNames(codes: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(codes.map(code => code.trim()).filter(Boolean))]
  const names = new Map<string, string>()

  for (let index = 0; index < unique.length; index += 15) {
    const filter = unique
      .slice(index, index + 15)
      .map(code => `U_MIS_NIK eq ${odataString(code)}`)
      .join(' or ')

    const payload = await sapB1AuthorizedJson<{ value?: Row[] }>(
      `/EmployeesInfo?$select=U_MIS_NIK,FirstName,LastName&$filter=${filter}`
    )
    for (const row of payload.value ?? []) {
      const code = String(row.U_MIS_NIK ?? '').trim()

      const name = employeeDisplayName(row.FirstName, row.LastName)
      if (code && name && name !== code) names.set(code, name)
    }
  }

  return names
}

/**
 * NIKs used as last operator / mechanic leader on recent WOs for one project.
 * EmployeesInfo has no project field, so project scope comes from ServiceCalls history.
 */
export async function listProjectRoleCodes(
  projectCode: string
): Promise<{ operators: string[]; mechanics: string[] }> {
  const project = projectCode.trim().toUpperCase()
  if (!project) return { operators: [], mechanics: [] }

  const rows = await readPages(
    `/ServiceCalls?$select=U_MIS_LastOpUse,U_MIS_Mech1&$filter=U_MIS_Project eq ${odataString(project)}&$orderby=ServiceCallID desc`,
    50,
    200
  )
  const operators = new Set<string>()
  const mechanics = new Set<string>()
  for (const row of rows) {
    const operator = String(row.U_MIS_LastOpUse ?? '').trim()
    const mechanic = String(row.U_MIS_Mech1 ?? '').trim()
    if (operator) operators.add(operator)
    if (mechanic) mechanics.add(mechanic)
  }

  return { operators: [...operators], mechanics: [...mechanics] }
}

/** Keep only employees whose NIK is in codes. Empty codes → keep the full list (new project). */
export function filterEmployeesByCodes(employees: CodeRow[], codes: string[]): CodeRow[] {
  if (!codes.length) return employees
  const allowed = new Set(codes)

  return employees.filter(row => allowed.has(row.code))
}

export type StaffScope = {
  branch: number
  plant: number
  production: number
}

/** Operator = Production and not a mechanic. Mechanic = Plant and a mechanic. Both must be active at the project branch. */
export function employeeStaffRole(
  row: { branch: number | null; department: number | null; mechanic: string; recordStatus: string },
  scope: StaffScope
): 'operator' | 'mechanic' | null {
  if (String(row.recordStatus ?? '').trim().toUpperCase() !== 'A') return null
  if (row.branch !== scope.branch) return null

  const mechanic = String(row.mechanic ?? '').trim().toUpperCase()
  if (mechanic === 'Y' && row.department === scope.plant) return 'mechanic'
  if (mechanic === 'N' && row.department === scope.production) return 'operator'

  return null
}

/** Assignee is a Plant user at the same branch as the project. */
export function isPlantAssignee(
  row: { branch: number | null; department: number | null },
  scope: Pick<StaffScope, 'branch' | 'plant'>
): boolean {
  return row.branch === scope.branch && row.department === scope.plant
}

function asInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : null
}

function employeeName(row: Row): CodeRow {
  const code = String(row.U_MIS_NIK ?? '').trim()

  const name = employeeDisplayName(row.FirstName, row.LastName)

  return { code, name: name || code }
}

function byName(left: CodeRow, right: CodeRow): number {
  return left.name.localeCompare(right.name) || left.code.localeCompare(right.code)
}

/**
 * Operator, mechanic, and assignee lists for one project.
 * Branch name is the project code. Plant and Production are department names.
 */
export async function listProjectPeople(projectCode: string): Promise<{
  operators: CodeRow[]
  mechanics: CodeRow[]
  users: CodeRow[]
}> {
  const empty = { operators: [] as CodeRow[], mechanics: [] as CodeRow[], users: [] as CodeRow[] }
  const project = projectCode.trim().toUpperCase()
  if (!project) return empty

  const branches = await sapB1AuthorizedJson<{ value?: Row[] }>(
    `/Branches?$select=Code,Name&$filter=Name eq ${odataString(project)}`
  )

  const branch = asInt(
    (branches.value ?? []).find(row => String(row.Name ?? '').trim().toUpperCase() === project)?.Code
  )
  if (branch === null) return empty

  const departments = await sapB1AuthorizedJson<{ value?: Row[] }>('/Departments?$select=Code,Name')
  let plant: number | null = null
  let production: number | null = null
  for (const row of departments.value ?? []) {
    const name = String(row.Name ?? '').trim().toLowerCase()
    const code = asInt(row.Code)
    if (code === null) continue
    if (name === 'plant') plant = code
    if (name === 'production') production = code
  }
  if (plant === null || production === null) return empty

  const scope: StaffScope = { branch, plant, production }

  const employeeSelect =
    'EmployeeID,FirstName,LastName,Department,Branch,U_MIS_NIK,U_MIS_IsMechanic,U_MIS_RecordSt'

  const mechanicRows = await readPages(
    `/EmployeesInfo?$select=${employeeSelect}&$filter=U_MIS_RecordSt eq 'A' and Branch eq ${branch} and Department eq ${plant} and U_MIS_IsMechanic eq 'Y'`,
    100,
    800
  )

  const operatorRows = await readPages(
    `/EmployeesInfo?$select=${employeeSelect}&$filter=U_MIS_RecordSt eq 'A' and Branch eq ${branch} and Department eq ${production} and U_MIS_IsMechanic eq 'N'`,
    100,
    800
  )

  const userRows = await readPages(
    `/Users?$select=InternalKey,UserCode,UserName,Department,Branch&$filter=Branch eq ${branch} and Department eq ${plant}`,
    100,
    800
  )

  const mechanics = mechanicRows
    .filter(row => employeeStaffRole(staffFields(row), scope) === 'mechanic')
    .map(employeeName)
    .filter(row => row.code)
    .sort(byName)

  const operators = operatorRows
    .filter(row => employeeStaffRole(staffFields(row), scope) === 'operator')
    .map(employeeName)
    .filter(row => row.code)
    .sort(byName)

  const users = userRows
    .filter(row => isPlantAssignee({ branch: asInt(row.Branch), department: asInt(row.Department) }, scope))
    .map(mapUser)
    .filter(row => row.code)
    .sort(byName)

  return { operators, mechanics, users }
}

function staffFields(row: Row): {
  branch: number | null
  department: number | null
  mechanic: string
  recordStatus: string
} {
  return {
    branch: asInt(row.Branch),
    department: asInt(row.Department),
    mechanic: String(row.U_MIS_IsMechanic ?? ''),
    recordStatus: String(row.U_MIS_RecordSt ?? '')
  }
}

/** Document 191 series whose name is `{year}-{site}`, e.g. 2024-023. The year is chosen by the caller. */
export async function findServiceCallSeries(projectCode: string, year: number): Promise<number | null> {
  const name = serviceCallSeriesName(projectCode, year)
  if (!name) return null

  const payload = await sapB1AuthorizedJson<{ value?: Row[] }>('/SeriesService_GetDocumentSeries', {
    method: 'POST',
    body: { DocumentTypeParams: { Document: '191' } }
  })

  const match = (payload.value ?? []).find(
    row => String(row.Name ?? '') === name && String(row.Locked ?? '') !== 'tYES'
  )
  const series = Number(match?.Series)

  return Number.isInteger(series) && series > 0 ? series : null
}
