/**
 * SAP B1 EmployeesInfo (OHEM) — list / get / create / update via Service Layer.
 * Used by System → SAP Employees for NIK, status, branch/dept, and mechanic flag.
 */
import { employeeDisplayName } from '@/lib/dmbd/employee-label'
import { escapeODataString } from '@/lib/sap-b1/odata'
import { sapB1AuthorizedFetch, sapB1AuthorizedJson } from '@/lib/sap-b1/session'
import { SapB1UnavailableError } from '@/lib/sap-b1/config'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'

type SapRow = Record<string, unknown>

export type SapEmployee = {
  employeeId: number
  firstName: string
  middleName: string
  lastName: string
  displayName: string
  nik: string
  branch: number | null
  department: number | null

  /** SAP EmployeesInfo.Position → EmployeePosition.PositionID */
  position: number | null
  positionName?: string

  /** U_MIS_EmpCategory — ST=Site, HO=Head Office */
  empCategory: string
  empCategoryName?: string
  isMechanic: 'Y' | 'N' | ''

  /** A = Activated, D = Deactivated (SAP U_MIS_RecordSt). */
  recordStatus: 'A' | 'D' | string
  jobTitle: string
}

export type SapCodeOption = { code: number; name: string }

/** String-coded lookups (e.g. U_MIS_EmpCategory ValidValues). */
export type SapStringOption = { code: string; name: string }

export type ListEmployeesInput = {
  q?: string
  branch?: number | null
  department?: number | null
  position?: number | null
  empCategory?: string
  isMechanic?: 'Y' | 'N' | ''
  recordStatus?: 'A' | 'D' | ''
  page?: number
  pageSize?: number
}

export type EmployeeWriteInput = {
  firstName: string
  middleName?: string
  lastName?: string
  nik: string
  branch: number | null | string
  department: number | null | string
  position?: number | null | string
  empCategory?: string
  isMechanic: 'Y' | 'N' | string
  recordStatus: 'A' | 'D' | string
  jobTitle?: string
}

type NormalizedWrite = {
  firstName: string
  middleName: string
  lastName: string
  nik: string
  branch: number | null
  department: number | null
  position: number | null
  empCategory: string
  isMechanic: 'Y' | 'N'
  recordStatus: 'A' | 'D'
  jobTitle: string
}

const EMPLOYEE_SELECT =
  'EmployeeID,FirstName,MiddleName,LastName,JobTitle,Position,Department,Branch,U_MIS_NIK,U_MIS_IsMechanic,U_MIS_RecordSt,U_MIS_EmpCategory'

/** Fallback when UserFieldsMD ValidValuesMD is unavailable. */
const DEFAULT_EMP_CATEGORIES: SapStringOption[] = [
  { code: 'ST', name: 'Site' },
  { code: 'HO', name: 'Head Office' }
]

/** Service Layer page size for internal reads (not an API/UI page-size limit). */
const SAP_PAGE_SIZE = 100
const LIST_MAX_ROWS = 10000
const META_TTL_MS = 5 * 60 * 1000

type EmployeeMetaCache = {
  at: number
  branches: SapCodeOption[]
  departments: SapCodeOption[]
  positions: SapCodeOption[]
  empCategories: SapStringOption[]
}

let employeeMetaCache: EmployeeMetaCache | null = null

function asInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : null
}

function asMechanic(value: unknown): 'Y' | 'N' | '' {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
  if (raw === 'Y' || raw === 'N') return raw

  return ''
}

/** Normalize SAP U_MIS_RecordSt: A=Activated, D=Deactivated (legacy I → D). */
export function asRecordStatus(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
  if (raw === 'I' || raw === 'INACTIVE') return 'D'
  if (raw === 'ACTIVE') return 'A'
  if (raw === 'DEACTIVATED') return 'D'

  return raw || ''
}

/** Coerce write/filter status to A or D. */
export function normalizeRecordStatusCode(value: unknown): 'A' | 'D' | null {
  const raw = asRecordStatus(value)
  if (raw === 'A' || raw === 'D') return raw

  return null
}

function headerCount(headers: Record<string, string | string[] | undefined>): number | null {
  const raw = headers['odata-count'] ?? headers['OData-Count']
  const text = Array.isArray(raw) ? raw[0] : raw
  if (text == null || text === '') return null
  const parsed = Number(text)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/** Map a Service Layer EmployeesInfo row to the admin DTO. */
export function mapEmployeeRow(row: SapRow): SapEmployee | null {
  const employeeId = asInt(row.EmployeeID)
  if (employeeId === null || employeeId <= 0) return null

  const firstName = String(row.FirstName ?? '').trim()
  const middleName = String(row.MiddleName ?? '').trim()
  const lastName = String(row.LastName ?? '').trim()
  const nik = String(row.U_MIS_NIK ?? '').trim()
  const displayName = employeeDisplayName(firstName, lastName, middleName) || nik || String(employeeId)

  return {
    employeeId,
    firstName,
    middleName,
    lastName,
    displayName,
    nik,
    branch: asInt(row.Branch),
    department: asInt(row.Department),
    position: asInt(row.Position),
    empCategory: String(row.U_MIS_EmpCategory ?? '')
      .trim()
      .toUpperCase(),
    isMechanic: asMechanic(row.U_MIS_IsMechanic),
    recordStatus: asRecordStatus(row.U_MIS_RecordSt),
    jobTitle: String(row.JobTitle ?? '').trim()
  }
}

/** Attach EmpCategory code → description from ValidValues. */
export function attachEmpCategoryNames(
  rows: SapEmployee[],
  categories: SapStringOption[]
): SapEmployee[] {
  const names = new Map(categories.map(row => [row.code.toUpperCase(), row.name]))

  return rows.map(row => ({
    ...row,
    empCategoryName: row.empCategory ? names.get(row.empCategory.toUpperCase()) ?? '' : ''
  }))
}

/** Attach PositionID → Name from EmployeePosition lookup. */
export function attachPositionNames(rows: SapEmployee[], positions: SapCodeOption[]): SapEmployee[] {
  const names = new Map(positions.map(row => [row.code, row.name]))

  return rows.map(row => ({
    ...row,
    positionName: row.position != null ? names.get(row.position) ?? '' : ''
  }))
}

/** True when the request has at least one list filter (empty = do not query SAP). */
export function hasEmployeeListFilter(input: ListEmployeesInput): boolean {
  if (String(input.q ?? '').trim()) return true
  if (input.branch != null && Number.isInteger(Number(input.branch))) return true
  if (input.department != null && Number.isInteger(Number(input.department))) return true
  if (input.position != null && Number.isInteger(Number(input.position))) return true
  if (String(input.empCategory ?? '').trim()) return true

  const mechanic = String(input.isMechanic ?? '')
    .trim()
    .toUpperCase()
  if (mechanic === 'Y' || mechanic === 'N') return true
  if (normalizeRecordStatusCode(input.recordStatus)) return true

  return false
}

/** Build OData $filter for the employee list. Empty string = no filter. */
export function buildEmployeeListFilter(input: ListEmployeesInput): string {
  const clauses: string[] = []
  const q = String(input.q ?? '').trim()
  if (q) {
    const escaped = escapeODataString(q)
    clauses.push(
      `(contains(FirstName,'${escaped}') or contains(MiddleName,'${escaped}') or contains(LastName,'${escaped}') or contains(U_MIS_NIK,'${escaped}'))`
    )
  }

  if (input.branch != null && Number.isInteger(input.branch)) {
    clauses.push(`Branch eq ${input.branch}`)
  }

  if (input.department != null && Number.isInteger(input.department)) {
    clauses.push(`Department eq ${input.department}`)
  }

  if (input.position != null && Number.isInteger(input.position)) {
    clauses.push(`Position eq ${input.position}`)
  }

  const empCategory = String(input.empCategory ?? '')
    .trim()
    .toUpperCase()
  if (empCategory) {
    clauses.push(`U_MIS_EmpCategory eq '${escapeODataString(empCategory)}'`)
  }

  const mechanic = String(input.isMechanic ?? '')
    .trim()
    .toUpperCase()
  if (mechanic === 'Y' || mechanic === 'N') {
    clauses.push(`U_MIS_IsMechanic eq '${mechanic}'`)
  }

  const status = normalizeRecordStatusCode(input.recordStatus)
  if (status) {
    clauses.push(`U_MIS_RecordSt eq '${status}'`)
  }

  return clauses.join(' and ')
}

function normalizeWriteInput(input: EmployeeWriteInput): NormalizedWrite {
  const firstName = String(input.firstName ?? '').trim()
  const middleName = String(input.middleName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  const nik = String(input.nik ?? '').trim()
  const jobTitle = String(input.jobTitle ?? '').trim()

  const empCategory = String(input.empCategory ?? '')
    .trim()
    .toUpperCase()

  const isMechanic = String(input.isMechanic ?? '')
    .trim()
    .toUpperCase()
  const recordStatus = normalizeRecordStatusCode(input.recordStatus)

  if (!firstName) throw new Error('First name is required')
  if (!nik) throw new Error('NIK is required')
  if (isMechanic !== 'Y' && isMechanic !== 'N') throw new Error('Is mechanic must be Y or N')
  if (!recordStatus) throw new Error('Status must be A (Activated) or D (Deactivated)')
  if (empCategory && empCategory.length > 2) throw new Error('Employee category must be at most 2 characters')

  const branch = input.branch == null || input.branch === '' ? null : Number(input.branch)
  const department = input.department == null || input.department === '' ? null : Number(input.department)
  const position = input.position == null || input.position === '' ? null : Number(input.position)

  if (branch !== null && !Number.isInteger(branch)) throw new Error('Branch must be a number')
  if (department !== null && !Number.isInteger(department)) throw new Error('Department must be a number')
  if (position !== null && !Number.isInteger(position)) throw new Error('Position must be a number')

  return {
    firstName,
    middleName,
    lastName,
    nik,
    branch,
    department,
    position,
    empCategory,
    isMechanic,
    recordStatus: recordStatus as 'A' | 'D',
    jobTitle
  }
}

function toSapBody(input: NormalizedWrite): Record<string, unknown> {
  const body: Record<string, unknown> = {
    FirstName: input.firstName,
    MiddleName: input.middleName || null,
    LastName: input.lastName || null,
    JobTitle: input.jobTitle || null,
    U_MIS_NIK: input.nik,
    U_MIS_IsMechanic: input.isMechanic,
    U_MIS_RecordSt: input.recordStatus,
    U_MIS_EmpCategory: input.empCategory || null
  }

  body.Branch = input.branch
  body.Department = input.department
  body.Position = input.position

  return body
}

function listPath(params: Record<string, string>): string {
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')

  return `/EmployeesInfo?${query}`
}

/** Branches for project/site dropdown (Code + Name). */
export async function listEmployeeBranches(): Promise<SapCodeOption[]> {
  const payload = await sapB1AuthorizedJson<{ value?: SapRow[] }>(
    '/Branches?$select=Code,Name&$orderby=Name'
  )

  return (payload.value ?? [])
    .map(row => {
      const code = asInt(row.Code)
      const name = String(row.Name ?? '').trim()
      if (code === null || !name) return null

      return { code, name }
    })
    .filter((row): row is SapCodeOption => row !== null)
}

/** Departments for Plant / Production dropdown. */
export async function listEmployeeDepartments(): Promise<SapCodeOption[]> {
  const payload = await sapB1AuthorizedJson<{ value?: SapRow[] }>(
    '/Departments?$select=Code,Name&$orderby=Name'
  )

  return (payload.value ?? [])
    .map(row => {
      const code = asInt(row.Code)
      const name = String(row.Name ?? '').trim()
      if (code === null || !name) return null

      return { code, name }
    })
    .filter((row): row is SapCodeOption => row !== null)
}

/** Employee positions (OHPS) — PositionID + Name. */
export async function listEmployeePositions(): Promise<SapCodeOption[]> {
  const rows: SapCodeOption[] = []
  for (let skip = 0; skip < 5000; skip += SAP_PAGE_SIZE) {
    const payload = await sapB1AuthorizedJson<{ value?: SapRow[] }>(
      `/EmployeePosition?$select=PositionID,Name&$orderby=Name&$top=${SAP_PAGE_SIZE}&$skip=${skip}`
    )
    const batch = payload.value ?? []
    for (const row of batch) {
      const code = asInt(row.PositionID)
      const name = String(row.Name ?? '').trim()
      if (code !== null && name) rows.push({ code, name })
    }
    if (batch.length < SAP_PAGE_SIZE) break
  }

  return rows
}

/** Employee category ValidValues from UDF MIS_EmpCategory (ST/HO). */
export async function listEmployeeCategories(): Promise<SapStringOption[]> {
  try {
    const payload = await sapB1AuthorizedJson<{ value?: SapRow[] }>(
      "/UserFieldsMD?$filter=TableName eq 'OHEM' and Name eq 'MIS_EmpCategory'"
    )
    const values = (payload.value?.[0]?.ValidValuesMD as SapRow[] | undefined) ?? []

    const rows = values
      .map(row => {
        const code = String(row.Value ?? '')
          .trim()
          .toUpperCase()
        const name = String(row.Description ?? '').trim() || code
        if (!code) return null

        return { code, name }
      })
      .filter((row): row is SapStringOption => row !== null)

    return rows.length ? rows : DEFAULT_EMP_CATEGORIES
  } catch {
    return DEFAULT_EMP_CATEGORIES
  }
}

/**
 * Branches + departments + positions + emp categories (short TTL cache).
 * One SAP GET at a time — parallel Service Layer calls hang → SAP_B1_TIMEOUT → 502.
 */
export async function getEmployeeLookupMeta(): Promise<{
  branches: SapCodeOption[]
  departments: SapCodeOption[]
  positions: SapCodeOption[]
  empCategories: SapStringOption[]
}> {
  if (
    employeeMetaCache &&
    Date.now() - employeeMetaCache.at < META_TTL_MS &&
    Array.isArray(employeeMetaCache.empCategories)
  ) {
    return {
      branches: employeeMetaCache.branches,
      departments: employeeMetaCache.departments,
      positions: employeeMetaCache.positions,
      empCategories: employeeMetaCache.empCategories
    }
  }

  const loadCode = async (run: () => Promise<SapCodeOption[]>): Promise<SapCodeOption[]> => {
    try {
      return await run()
    } catch {
      return []
    }
  }

  const branches = await loadCode(listEmployeeBranches)
  const departments = await loadCode(listEmployeeDepartments)
  const positions = await loadCode(listEmployeePositions)
  const empCategories = await listEmployeeCategories()

  employeeMetaCache = { at: Date.now(), branches, departments, positions, empCategories }

  return { branches, departments, positions, empCategories }
}

async function fetchEmployeePage(input: ListEmployeesInput, pageSize: number, skip: number): Promise<{
  data: SapEmployee[]
  totalHint: number | null
}> {
  const filter = buildEmployeeListFilter(input)

  const params: Record<string, string> = {
    $select: EMPLOYEE_SELECT,
    $orderby: 'FirstName,LastName,EmployeeID',
    $top: String(pageSize),
    $skip: String(skip),
    $count: 'true'
  }
  if (filter) params.$filter = filter

  const res = await sapB1AuthorizedFetch(listPath(params))
  if (res.status === 401) {
    throw new SapB1UnavailableError(toFriendlySapErrorMessage('SAP B1 session expired (401 Unauthorized)'))
  }
  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      // ignore
    }
    throw new SapB1UnavailableError(
      toFriendlySapErrorMessage(`SAP B1 error: ${res.status} ${JSON.stringify(body ?? '')}`)
    )
  }

  // B1 SL often returns OData v1 keys: odata.count (not @odata.count).
  const payload = ((await res.json()) ?? {}) as {
    value?: SapRow[]
    '@odata.count'?: number
    'odata.count'?: number
  }

  const data = (payload.value ?? [])
    .map(mapEmployeeRow)
    .filter((row): row is SapEmployee => row !== null)

  const rawCount = payload['@odata.count'] ?? payload['odata.count']
  const odataCount = typeof rawCount === 'number' ? rawCount : Number(rawCount)
  const fromHeader = headerCount(res.headers as Record<string, string | string[] | undefined>)

  const totalHint =
    Number.isFinite(odataCount) && odataCount >= 0 ? odataCount : fromHeader

  return { data, totalHint }
}

/**
 * Paginated employee list (legacy). Prefer listEmployeesByFilter for the admin UI.
 */
export async function listEmployees(input: ListEmployeesInput = {}): Promise<{
  data: SapEmployee[]
  total: number
  page: number
  pageSize: number
}> {
  const page = Math.max(0, Number(input.page) || 0)
  const pageSize = Math.min(SAP_PAGE_SIZE, Math.max(1, Number(input.pageSize) || 25))
  const skip = page * pageSize
  const { data, totalHint } = await fetchEmployeePage(input, pageSize, skip)

  let total: number
  if (totalHint != null) {
    total = totalHint
  } else if (data.length < pageSize) {
    total = skip + data.length
  } else {
    total = skip + data.length + pageSize
  }

  return { data, total, page, pageSize }
}

/**
 * All employees matching filters (server-side SAP paging, no UI page-size limit).
 * Requires at least one filter — call hasEmployeeListFilter first.
 */
export async function listEmployeesByFilter(
  input: Omit<ListEmployeesInput, 'page' | 'pageSize'> = {}
): Promise<{ data: SapEmployee[]; total: number }> {
  if (!hasEmployeeListFilter(input)) {
    return { data: [], total: 0 }
  }

  const rows: SapEmployee[] = []
  let totalHint: number | null = null

  for (let skip = 0; skip < LIST_MAX_ROWS; skip += SAP_PAGE_SIZE) {
    const batch = await fetchEmployeePage(input, SAP_PAGE_SIZE, skip)
    if (batch.totalHint != null) totalHint = batch.totalHint
    rows.push(...batch.data)
    if (batch.data.length < SAP_PAGE_SIZE) break
    if (totalHint != null && rows.length >= totalHint) break
  }

  const data = rows.slice(0, LIST_MAX_ROWS)

  return { data, total: totalHint != null ? Math.min(totalHint, data.length) || data.length : data.length }
}

/** @deprecated Use listEmployeesByFilter — kept for export helpers. */
export async function listEmployeesAll(
  input: Omit<ListEmployeesInput, 'page' | 'pageSize'> = {}
): Promise<SapEmployee[]> {
  const result = await listEmployeesByFilter(input)

  return result.data
}

/** Find one employee by NIK (exact). */
export async function findEmployeeByNik(nik: string): Promise<SapEmployee | null> {
  const code = String(nik ?? '').trim()
  if (!code) return null

  const payload = await sapB1AuthorizedJson<{ value?: SapRow[] }>(
    listPath({
      $select: EMPLOYEE_SELECT,
      $filter: `U_MIS_NIK eq '${escapeODataString(code)}'`,
      $top: '1'
    })
  )

  const row = payload.value?.[0]
  if (!row) return null

  return mapEmployeeRow(row)
}

export async function getEmployee(employeeId: number): Promise<SapEmployee | null> {
  if (!Number.isInteger(employeeId) || employeeId <= 0) return null

  try {
    const row = await sapB1AuthorizedJson<SapRow>(
      `/EmployeesInfo(${employeeId})?$select=${EMPLOYEE_SELECT}`
    )

    return mapEmployeeRow(row)
  } catch {
    return null
  }
}

/** True when another employee already uses this NIK. */
export async function isNikTaken(nik: string, exceptEmployeeId?: number): Promise<boolean> {
  const code = String(nik ?? '').trim()
  if (!code) return false

  const filter = `U_MIS_NIK eq '${escapeODataString(code)}'`

  const payload = await sapB1AuthorizedJson<{ value?: SapRow[] }>(
    `/EmployeesInfo?$select=EmployeeID,U_MIS_NIK&$filter=${encodeURIComponent(filter)}&$top=5`
  )

  return (payload.value ?? []).some(row => {
    const id = asInt(row.EmployeeID)
    if (id === null) return false
    if (exceptEmployeeId != null && id === exceptEmployeeId) return false

    return String(row.U_MIS_NIK ?? '').trim() === code
  })
}

export async function createEmployee(input: EmployeeWriteInput): Promise<SapEmployee> {
  const normalized = normalizeWriteInput(input)
  if (await isNikTaken(normalized.nik)) {
    throw new Error(`NIK ${normalized.nik} is already used by another employee`)
  }

  const row = await sapB1AuthorizedJson<SapRow>('/EmployeesInfo', {
    method: 'POST',
    body: toSapBody(normalized)
  })

  const mapped = row ? mapEmployeeRow(row) : null
  if (mapped) return mapped

  const id = row ? asInt(row.EmployeeID) : null
  if (id !== null) {
    const fetched = await getEmployee(id)
    if (fetched) return fetched
  }

  // Some Service Layer builds return 204 with no body — locate by NIK.
  const byNik = await sapB1AuthorizedJson<{ value?: SapRow[] }>(
    listPath({
      $select: EMPLOYEE_SELECT,
      $filter: `U_MIS_NIK eq '${escapeODataString(normalized.nik)}'`,
      $top: '1'
    })
  )
  const found = mapEmployeeRow(byNik.value?.[0] ?? {})
  if (found) return found

  throw new Error('Employee was created but could not be reloaded')
}

export async function updateEmployee(employeeId: number, input: EmployeeWriteInput): Promise<SapEmployee> {
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    throw new Error('Invalid employee id')
  }

  const normalized = normalizeWriteInput(input)
  if (await isNikTaken(normalized.nik, employeeId)) {
    throw new Error(`NIK ${normalized.nik} is already used by another employee`)
  }

  await sapB1AuthorizedJson(`/EmployeesInfo(${employeeId})`, {
    method: 'PATCH',
    body: toSapBody(normalized)
  })

  const fetched = await getEmployee(employeeId)
  if (!fetched) throw new Error('Employee was updated but could not be reloaded')

  return fetched
}

/** Soft-deactivate: set U_MIS_RecordSt = D (no SAP delete). */
export async function deactivateEmployee(employeeId: number): Promise<SapEmployee> {
  const current = await getEmployee(employeeId)
  if (!current) throw new Error('Employee not found')

  await sapB1AuthorizedJson(`/EmployeesInfo(${employeeId})`, {
    method: 'PATCH',
    body: { U_MIS_RecordSt: 'D' }
  })

  const fetched = await getEmployee(employeeId)
  if (!fetched) throw new Error('Employee was deactivated but could not be reloaded')

  return fetched
}

/** Reactivate: set U_MIS_RecordSt = A. */
export async function activateEmployee(employeeId: number): Promise<SapEmployee> {
  const current = await getEmployee(employeeId)
  if (!current) throw new Error('Employee not found')

  await sapB1AuthorizedJson(`/EmployeesInfo(${employeeId})`, {
    method: 'PATCH',
    body: { U_MIS_RecordSt: 'A' }
  })

  const fetched = await getEmployee(employeeId)
  if (!fetched) throw new Error('Employee was activated but could not be reloaded')

  return fetched
}
