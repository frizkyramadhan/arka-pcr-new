/**
 * Excel export / import for SAP EmployeesInfo admin.
 * Columns match the admin form: NIK, status, branch, department, mechanic.
 */
import ExcelJS from 'exceljs'

import type { SapCodeOption, SapEmployee, SapStringOption } from '@/lib/sap-b1/employees-service'

export const EMPLOYEE_EXCEL_COLUMNS = [
  { header: 'employee_id', key: 'employee_id', width: 12 },
  { header: 'first_name', key: 'first_name', width: 18 },
  { header: 'middle_name', key: 'middle_name', width: 16 },
  { header: 'last_name', key: 'last_name', width: 18 },
  { header: 'nik', key: 'nik', width: 14 },
  { header: 'job_title', key: 'job_title', width: 18 },
  { header: 'position', key: 'position', width: 10 },
  { header: 'position_name', key: 'position_name', width: 22 },
  { header: 'emp_category', key: 'emp_category', width: 12 },
  { header: 'emp_category_name', key: 'emp_category_name', width: 14 },
  { header: 'branch', key: 'branch', width: 10 },
  { header: 'branch_name', key: 'branch_name', width: 14 },
  { header: 'department', key: 'department', width: 12 },
  { header: 'department_name', key: 'department_name', width: 16 },
  { header: 'is_mechanic', key: 'is_mechanic', width: 12 },
  { header: 'record_status', key: 'record_status', width: 14 }
] as const

export const EMPLOYEE_IMPORT_HEADER_ALIASES = {
  employeeId: ['employee_id', 'employeeid', 'employee id', 'id'],
  firstName: ['first_name', 'firstname', 'first name'],
  middleName: ['middle_name', 'middlename', 'middle name'],
  lastName: ['last_name', 'lastname', 'last name'],
  nik: ['nik', 'u_mis_nik'],
  jobTitle: ['job_title', 'jobtitle', 'job title'],
  position: ['position', 'position_id', 'positionid'],
  empCategory: ['emp_category', 'empcategory', 'category', 'u_mis_empcategory'],
  branch: ['branch', 'branch_code'],
  department: ['department', 'department_code', 'dept'],
  isMechanic: ['is_mechanic', 'ismechanic', 'mechanic', 'u_mis_ismechanic'],
  recordStatus: ['record_status', 'recordstatus', 'status', 'u_mis_recordst']
} as const

export type EmployeeImportRow = {
  rowNumber: number
  employeeId: number | null
  firstName: string
  middleName: string
  lastName: string
  nik: string
  jobTitle: string
  position: number | null
  empCategory: string
  branch: number | null
  department: number | null
  isMechanic: 'Y' | 'N'
  recordStatus: 'A' | 'D'
}

export type EmployeeImportRowError = {
  row: number
  column: string
  value: unknown
  message: string
}

function nameMap(options: SapCodeOption[]): Map<number, string> {
  return new Map(options.map(row => [row.code, row.name]))
}

function stringNameMap(options: SapStringOption[]): Map<string, string> {
  return new Map(options.map(row => [row.code.toUpperCase(), row.name]))
}

function parseHeaderIndex(headers: string[], candidates: readonly string[]) {
  return headers.findIndex(header => candidates.includes(header))
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text?: unknown }).text ?? '').trim()
  }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return String((value as { result?: unknown }).result ?? '').trim()
  }

  return String(value).trim()
}

function cellInt(value: unknown): number | null {
  const text = cellText(value)
  if (!text) return null
  const parsed = Number(text)

  return Number.isInteger(parsed) ? parsed : null
}

function normalizeYn(value: unknown): 'Y' | 'N' | null {
  const raw = cellText(value).toUpperCase()
  if (!raw) return null
  if (raw === 'Y' || raw === 'YES' || raw === '1' || raw === 'TRUE') return 'Y'
  if (raw === 'N' || raw === 'NO' || raw === '0' || raw === 'FALSE') return 'N'

  return null
}

function normalizeStatus(value: unknown): 'A' | 'D' | null {
  const raw = cellText(value).toUpperCase()
  if (!raw) return null
  if (raw === 'A' || raw === 'ACTIVE' || raw === 'ACTIVATED') return 'A'
  if (raw === 'D' || raw === 'DEACTIVATED' || raw === 'I' || raw === 'INACTIVE') return 'D'

  return null
}

function setupEmployeesSheet(sheet: ExcelJS.Worksheet) {
  sheet.columns = EMPLOYEE_EXCEL_COLUMNS.map(column => ({ ...column }))
  const header = sheet.getRow(1)
  header.font = { bold: true }
}

function addLookupSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  options: Array<{ code: string | number; name: string }>
) {
  const sheet = workbook.addWorksheet(name)
  sheet.columns = [
    { header: 'code', key: 'code', width: 10 },
    { header: 'name', key: 'name', width: 24 }
  ]
  sheet.getRow(1).font = { bold: true }
  for (const row of options) {
    sheet.addRow({ code: row.code, name: row.name })
  }
}

/** Empty template with header + branch/department/position/category lookup sheets. */
export async function buildEmployeeTemplateWorkbook(
  branches: SapCodeOption[],
  departments: SapCodeOption[],
  positions: SapCodeOption[] = [],
  empCategories: SapStringOption[] = []
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  setupEmployeesSheet(workbook.addWorksheet('Employees'))
  addLookupSheet(workbook, 'Branches', branches)
  addLookupSheet(workbook, 'Departments', departments)
  addLookupSheet(workbook, 'Positions', positions)
  addLookupSheet(workbook, 'EmpCategories', empCategories)

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

/** Export current filter rows + lookup sheets. */
export async function buildEmployeeExportWorkbook(
  employees: SapEmployee[],
  branches: SapCodeOption[],
  departments: SapCodeOption[],
  positions: SapCodeOption[] = [],
  empCategories: SapStringOption[] = []
): Promise<{ buffer: Buffer; filename: string }> {
  const branchNames = nameMap(branches)
  const departmentNames = nameMap(departments)
  const positionNames = nameMap(positions)
  const categoryNames = stringNameMap(empCategories)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Employees')
  setupEmployeesSheet(sheet)

  for (const row of employees) {
    sheet.addRow({
      employee_id: row.employeeId,
      first_name: row.firstName,
      middle_name: row.middleName || '',
      last_name: row.lastName,
      nik: row.nik,
      job_title: row.jobTitle,
      position: row.position ?? '',
      position_name:
        row.positionName || (row.position != null ? positionNames.get(row.position) ?? '' : ''),
      emp_category: row.empCategory || '',
      emp_category_name:
        row.empCategoryName ||
        (row.empCategory ? categoryNames.get(row.empCategory.toUpperCase()) ?? '' : ''),
      branch: row.branch ?? '',
      branch_name: row.branch != null ? branchNames.get(row.branch) ?? '' : '',
      department: row.department ?? '',
      department_name: row.department != null ? departmentNames.get(row.department) ?? '' : '',
      is_mechanic: row.isMechanic || '',
      record_status: row.recordStatus || ''
    })
  }

  addLookupSheet(workbook, 'Branches', branches)
  addLookupSheet(workbook, 'Departments', departments)
  addLookupSheet(workbook, 'Positions', positions)
  addLookupSheet(workbook, 'EmpCategories', empCategories)

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

  return { buffer, filename: 'sap-employees.xlsx' }
}

function isRowEmpty(values: unknown[]) {
  return values.every(value => value === null || value === undefined || String(value).trim() === '')
}

/** Parse Employees sheet into validated import rows (skips blank lines). */
export function parseEmployeeImportSheet(sheet: ExcelJS.Worksheet): {
  rows: EmployeeImportRow[]
  errors: EmployeeImportRowError[]
} {
  const headerRow = sheet.getRow(1)
  const rawHeaders = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : []

  const headers = rawHeaders
    .filter(value => value !== null && value !== undefined)
    .map(value => String(value).trim().toLowerCase())

  const idx = {
    employeeId: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.employeeId),
    firstName: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.firstName),
    middleName: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.middleName),
    lastName: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.lastName),
    nik: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.nik),
    jobTitle: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.jobTitle),
    position: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.position),
    empCategory: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.empCategory),
    branch: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.branch),
    department: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.department),
    isMechanic: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.isMechanic),
    recordStatus: parseHeaderIndex(headers, EMPLOYEE_IMPORT_HEADER_ALIASES.recordStatus)
  }

  const errors: EmployeeImportRowError[] = []
  if (idx.firstName < 0) {
    errors.push({ row: 1, column: 'first_name', value: null, message: 'Column first_name is required' })
  }
  if (idx.nik < 0) {
    errors.push({ row: 1, column: 'nik', value: null, message: 'Column nik is required' })
  }
  if (errors.length) return { rows: [], errors }

  const rows: EmployeeImportRow[] = []
  const maxRow = sheet.rowCount

  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber += 1) {
    const excelRow = sheet.getRow(rowNumber)
    const values = Array.isArray(excelRow.values) ? excelRow.values.slice(1) : []
    if (isRowEmpty(values)) continue

    const get = (index: number) => (index < 0 ? null : excelRow.getCell(index + 1).value)
    const firstName = cellText(get(idx.firstName))
    const middleName = cellText(get(idx.middleName))
    const nik = cellText(get(idx.nik))
    const lastName = cellText(get(idx.lastName))
    const jobTitle = cellText(get(idx.jobTitle))
    const employeeId = idx.employeeId < 0 ? null : cellInt(get(idx.employeeId))
    const position = idx.position < 0 ? null : cellInt(get(idx.position))
    const empCategory = idx.empCategory < 0 ? '' : cellText(get(idx.empCategory)).toUpperCase()
    const branch = idx.branch < 0 ? null : cellInt(get(idx.branch))
    const department = idx.department < 0 ? null : cellInt(get(idx.department))

    if (!firstName) {
      errors.push({ row: rowNumber, column: 'first_name', value: get(idx.firstName), message: 'First name is required' })
      continue
    }
    if (!nik) {
      errors.push({ row: rowNumber, column: 'nik', value: get(idx.nik), message: 'NIK is required' })
      continue
    }

    if (idx.employeeId >= 0 && cellText(get(idx.employeeId)) && employeeId === null) {
      errors.push({
        row: rowNumber,
        column: 'employee_id',
        value: get(idx.employeeId),
        message: 'employee_id must be a whole number'
      })
      continue
    }

    if (idx.position >= 0 && cellText(get(idx.position)) && position === null) {
      errors.push({
        row: rowNumber,
        column: 'position',
        value: get(idx.position),
        message: 'position must be a whole number (PositionID)'
      })
      continue
    }

    if (idx.branch >= 0 && cellText(get(idx.branch)) && branch === null) {
      errors.push({ row: rowNumber, column: 'branch', value: get(idx.branch), message: 'branch must be a whole number' })
      continue
    }

    if (idx.department >= 0 && cellText(get(idx.department)) && department === null) {
      errors.push({
        row: rowNumber,
        column: 'department',
        value: get(idx.department),
        message: 'department must be a whole number'
      })
      continue
    }

    const mechanicRaw = idx.isMechanic < 0 ? 'N' : get(idx.isMechanic)
    const isMechanic = normalizeYn(mechanicRaw ?? 'N')
    if (!isMechanic) {
      errors.push({
        row: rowNumber,
        column: 'is_mechanic',
        value: mechanicRaw,
        message: 'is_mechanic must be Y or N'
      })
      continue
    }

    const statusRaw = idx.recordStatus < 0 ? 'A' : get(idx.recordStatus)
    const recordStatus = normalizeStatus(statusRaw ?? 'A')
    if (!recordStatus) {
      errors.push({
        row: rowNumber,
        column: 'record_status',
        value: statusRaw,
        message: 'record_status must be A (Activated) or D (Deactivated)'
      })
      continue
    }

    rows.push({
      rowNumber,
      employeeId,
      firstName,
      middleName,
      lastName,
      nik,
      jobTitle,
      position,
      empCategory,
      branch,
      department,
      isMechanic,
      recordStatus
    })
  }

  return { rows, errors }
}
