import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { resolveEquipmentByUnitNo } from '@/lib/hour-meter/service'
import { createSosRecord } from '@/lib/sos/service'
import { SOS_DECIMAL_FIELDS } from '@/lib/sos/field-groups'
import { sosCreateSchema } from '@/lib/validations/sos'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

const MAX_FILE_SIZE = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024

function parseHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex(header => candidates.includes(header))
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const date = new Date(excelEpoch.getTime() + value * 86400000)

    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(String(value))

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseBoolean(value: unknown) {
  if (value === null || value === undefined || value === '') return false
  const text = String(value).trim().toLowerCase()

  return ['1', 'true', 'yes', 'y'].includes(text)
}

function headerToField(header: string): string {
  return header.replace(/\s+/g, '_').replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'sos.create')
  if (forbidden) return forbidden

  const formData = await request.formData()
  const file = formData.get('file')
  const fleetUnitIdRaw = formData.get('fleetUnitId') ?? formData.get('fleetEquipmentId')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    return NextResponse.json({ error: 'Worksheet not found' }, { status: 400 })
  }

  const headerRow = sheet.getRow(1)
  const rawHeaders = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : []

  const headers = rawHeaders
    .filter(value => value !== null && value !== undefined)
    .map(value => String(value).trim().toLowerCase())

  const defaultFleetId = fleetUnitIdRaw ? Number(fleetUnitIdRaw) : null
  const unitNoIndex = parseHeaderIndex(headers, ['unit_no', 'unit no', 'unit'])
  const fleetIdIndex = parseHeaderIndex(headers, ['fleet_equipment_id', 'fleet_id', 'id_unit'])
  const idModIndex = parseHeaderIndex(headers, ['id_mod', 'model_component_id'])
  const sampleDateIndex = parseHeaderIndex(headers, ['sample_date', 'sample date', 'date'])

  if (sampleDateIndex === -1) {
    return NextResponse.json({ error: 'Missing sample_date column' }, { status: 400 })
  }

  let imported = 0
  const errors: string[] = []

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const sampleDate = parseExcelDate(row.getCell(sampleDateIndex + 1).value)

    if (!sampleDate) continue

    let fleetUnitId = defaultFleetId

    if (fleetIdIndex >= 0) {
      const raw = row.getCell(fleetIdIndex + 1).value
      fleetUnitId = raw ? Number(raw) : fleetUnitId
    }

    if (!fleetUnitId && unitNoIndex >= 0) {
      const unitNo = String(row.getCell(unitNoIndex + 1).value ?? '').trim()
      const equipment = await resolveEquipmentByUnitNo(session, unitNo)
      fleetUnitId = equipment?.fleetUnitId ?? null
    }

    if (!fleetUnitId) {
      errors.push(`Row ${rowNumber}: equipment not resolved`)
      continue
    }

    let idMod: number | null = null
    if (idModIndex >= 0) {
      const raw = row.getCell(idModIndex + 1).value
      idMod = raw ? Number(raw) : null
    }

    if (!idMod) {
      errors.push(`Row ${rowNumber}: missing id_mod`)
      continue
    }

    const payload: Record<string, unknown> = {
      fleetUnitId,
      idMod,
      sampleDate
    }

    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i]
      const cellValue = row.getCell(i + 1).value
      if (cellValue === null || cellValue === undefined || cellValue === '') continue

      const field = headerToField(header)
      if (['unitNo', 'fleetUnitId', 'idMod', 'sampleDate'].includes(field)) continue

      if (SOS_DECIMAL_FIELDS.includes(field)) {
        payload[field] = Number(cellValue)
      } else if (field === 'oilChange') {
        payload[field] = parseBoolean(cellValue)
      } else if (field === 'oilAdded') {
        payload[field] = Number(cellValue)
      } else {
        payload[field] = String(cellValue)
      }
    }

    const parsed = sosCreateSchema.safeParse(payload)
    if (!parsed.success) {
      errors.push(`Row ${rowNumber}: invalid data`)
      continue
    }

    try {
      await createSosRecord(session, parsed.data, Number(session.user.id) || undefined)
      imported += 1
    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'failed'}`)
    }
  }

  if (imported === 0) {
    return NextResponse.json({ error: 'No valid rows imported', details: errors }, { status: 400 })
  }

  return NextResponse.json({ imported, errors })
}
