/**
 * POST /api/admin/sap-employees/import — upsert EmployeesInfo from Excel.
 * Match by employee_id, else by NIK; otherwise create. Writes run sequentially.
 */
import ExcelJS from 'exceljs'
import { NextRequest, NextResponse } from 'next/server'

import { logActivity } from '@/lib/activity-log'
import { parseEmployeeImportSheet } from '@/lib/sap-b1/employees-sheet'
import {
  createEmployee,
  findEmployeeByNik,
  getEmployee,
  updateEmployee
} from '@/lib/sap-b1/employees-service'
import { SapB1ConfigError, SapB1DisabledError, SapB1UnavailableError } from '@/lib/sap-b1/config'
import {
  hasPermission,
  requireSession,
  requireSystemPermissionOrForbidden
} from '@/lib/utils/api-auth'

const MAX_FILE_SIZE = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024
const MAX_IMPORT_ROWS = 500

function sapMessage(error: unknown): string {
  if (error instanceof SapB1DisabledError || error instanceof SapB1ConfigError || error instanceof SapB1UnavailableError) {
    return error.message
  }

  return error instanceof Error ? error.message : 'SAP employee import failed'
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, [
    'sap-employees.create',
    'sap-employees.update'
  ])
  if (forbidden) return forbidden

  const canCreate = hasPermission(session, 'sap-employees.create')
  const canUpdate = hasPermission(session, 'sap-employees.update')

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required', errors: [] }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File is too large', errors: [] }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'Only .xlsx files are supported', errors: [] }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as never)

  const sheet =
    workbook.getWorksheet('Employees') ??
    workbook.worksheets.find(item => String(item.name).toLowerCase() === 'employees') ??
    workbook.worksheets[0]

  if (!sheet) {
    return NextResponse.json({ error: 'Worksheet not found', errors: [] }, { status: 400 })
  }

  const parsed = parseEmployeeImportSheet(sheet)
  if (parsed.errors.length && parsed.rows.length === 0) {
    return NextResponse.json(
      { error: 'Import validation failed', errors: parsed.errors, created: 0, updated: 0 },
      { status: 400 }
    )
  }

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      {
        error: `Too many rows (max ${MAX_IMPORT_ROWS})`,
        errors: [],
        created: 0,
        updated: 0
      },
      { status: 400 }
    )
  }

  let created = 0
  let updated = 0
  const errors = [...parsed.errors]

  for (const row of parsed.rows) {
    const payload = {
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      nik: row.nik,
      jobTitle: row.jobTitle,
      position: row.position,
      empCategory: row.empCategory,
      branch: row.branch,
      department: row.department,
      isMechanic: row.isMechanic,
      recordStatus: row.recordStatus
    }

    try {
      let existing =
        row.employeeId != null ? await getEmployee(row.employeeId) : await findEmployeeByNik(row.nik)

      if (!existing && row.employeeId != null) {
        // employee_id not found — fall back to NIK match before create
        existing = await findEmployeeByNik(row.nik)
      }

      if (existing) {
        if (!canUpdate) {
          errors.push({
            row: row.rowNumber,
            column: 'employee_id',
            value: existing.employeeId,
            message: 'Missing sap-employees.update permission'
          })
          continue
        }

        await updateEmployee(existing.employeeId, payload)
        updated += 1
      } else {
        if (!canCreate) {
          errors.push({
            row: row.rowNumber,
            column: 'nik',
            value: row.nik,
            message: 'Missing sap-employees.create permission'
          })
          continue
        }

        await createEmployee(payload)
        created += 1
      }
    } catch (error) {
      errors.push({
        row: row.rowNumber,
        column: 'nik',
        value: row.nik,
        message: sapMessage(error)
      })
    }
  }

  logActivity({
    session,
    logName: 'sap-employees',
    description: `Imported SAP employees (created ${created}, updated ${updated}, errors ${errors.length})`,
    properties: { created, updated, errorCount: errors.length, fileName: file.name }
  })

  const status = created + updated === 0 && errors.length > 0 ? 400 : 200

  return NextResponse.json(
    {
      created,
      updated,
      imported: created + updated,
      errors
    },
    { status }
  )
}
