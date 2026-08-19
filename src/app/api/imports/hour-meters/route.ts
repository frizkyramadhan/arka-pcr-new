import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import {
  formatExcelDate,
  HM_IMPORT_HEADER_ALIASES,
  parseExcelDateForImport,
  parseHeaderIndex
} from '@/lib/hour-meter/excel'
import {
  hmImportError,
  hmImportErrorsFromZod,
  type HmImportRowError
} from '@/lib/hour-meter/import-errors'
import { logActivity } from '@/lib/activity-log'
import { resolveUnitFromCacheByUnitNo, upsertHourMeterFromImport } from '@/lib/hour-meter/service'
import { hourMeterSchema } from '@/lib/validations/hour-meter'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

const MAX_FILE_SIZE = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024

function isRowEmpty(values: unknown[]) {
  return values.every(value => value === null || value === undefined || String(value).trim() === '')
}

function getCellValue(row: ExcelJS.Row, index: number) {
  if (index < 0) return null

  return row.getCell(index + 1).value
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'hour-meters.import')
  if (forbidden) return forbidden

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: 'File wajib diunggah',
        errors: [hmImportError(0, 'file', null, 'Tidak ada file yang dipilih')]
      },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: 'File terlalu besar',
        errors: [hmImportError(0, 'file', file.name, 'Ukuran file melebihi batas yang diizinkan')]
      },
      { status: 400 }
    )
  }

  if (!file.name.endsWith('.xlsx')) {
    return NextResponse.json(
      {
        error: 'Format file tidak valid',
        errors: [hmImportError(0, 'file', file.name, 'Hanya file .xlsx yang didukung')]
      },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    return NextResponse.json(
      {
        error: 'Worksheet tidak ditemukan',
        errors: [hmImportError(0, 'worksheet', null, 'File Excel tidak memiliki sheet')]
      },
      { status: 400 }
    )
  }

  const headerRow = sheet.getRow(1)
  const rawHeaders = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : []

  const headers = rawHeaders
    .filter(value => value !== null && value !== undefined)
    .map(value => String(value).trim().toLowerCase())

  const idHmIndex = parseHeaderIndex(headers, HM_IMPORT_HEADER_ALIASES.idHm)
  const unitNoIndex = parseHeaderIndex(headers, HM_IMPORT_HEADER_ALIASES.unitNo)
  const hmUnitIndex = parseHeaderIndex(headers, HM_IMPORT_HEADER_ALIASES.hmUnit)
  const whDayIndex = parseHeaderIndex(headers, HM_IMPORT_HEADER_ALIASES.whDay)
  const dateIndex = parseHeaderIndex(headers, HM_IMPORT_HEADER_ALIASES.dateHm)

  const headerErrors: HmImportRowError[] = []

  if (unitNoIndex === -1) {
    headerErrors.push(
      hmImportError(1, 'unit_no', null, 'Kolom unit_no wajib ada di baris header')
    )
  }
  if (hmUnitIndex === -1) {
    headerErrors.push(hmImportError(1, 'hm_unit', null, 'Kolom hm_unit wajib ada di baris header'))
  }
  if (whDayIndex === -1) {
    headerErrors.push(hmImportError(1, 'wh_day', null, 'Kolom wh_day wajib ada di baris header'))
  }
  if (dateIndex === -1) {
    headerErrors.push(hmImportError(1, 'date_hm', null, 'Kolom date_hm wajib ada di baris header'))
  }

  if (headerErrors.length > 0) {
    return NextResponse.json(
      { error: 'Format header Excel tidak valid', errors: headerErrors },
      { status: 400 }
    )
  }

  let imported = 0
  let created = 0
  let updated = 0
  let restored = 0
  const errors: HmImportRowError[] = []

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const hmUnitRaw = getCellValue(row, hmUnitIndex)
    const whDayRaw = getCellValue(row, whDayIndex)
    const dateCell = row.getCell(dateIndex + 1)
    const dateRaw = dateCell.value
    const dateText = typeof dateCell.text === 'string' ? dateCell.text : null
    const unitNoRaw = getCellValue(row, unitNoIndex)

    if (isRowEmpty([hmUnitRaw, whDayRaw, dateRaw, unitNoRaw])) continue
    if (hmUnitRaw === null || hmUnitRaw === undefined || hmUnitRaw === '') continue

    const dateParsed = parseExcelDateForImport(dateRaw, dateText)
    if (!dateParsed.ok) {
      errors.push(
        hmImportError(
          rowNumber,
          'date_hm',
          dateRaw instanceof Date ? formatExcelDate(dateRaw) : (dateText ?? dateRaw),
          dateParsed.message
        )
      )
      continue
    }

    const dateHm = dateParsed.date

    const unitNo = String(unitNoRaw ?? '').trim()
    if (!unitNo) {
      errors.push(
        hmImportError(
          rowNumber,
          'unit_no',
          unitNoRaw,
          'Unit No wajib diisi. Pastikan nilai cocok dengan data di fleet equipment cache.'
        )
      )
      continue
    }

    const equipment = await resolveUnitFromCacheByUnitNo(session, unitNo)
    if (!equipment) {
      errors.push(
        hmImportError(
          rowNumber,
          'unit_no',
          unitNo,
          `Unit "${unitNo}" tidak ditemukan di fleet equipment cache atau di luar scope project Anda. Sync unit terlebih dahulu jika perlu.`
        )
      )
      continue
    }

    const idHmRaw = idHmIndex >= 0 ? getCellValue(row, idHmIndex) : null
    const idHm = idHmRaw ? Number(idHmRaw) : null

    if (idHmRaw !== null && idHmRaw !== undefined && idHmRaw !== '' && Number.isNaN(idHm)) {
      errors.push(
        hmImportError(rowNumber, 'id_hm', idHmRaw, 'ID HM harus berupa angka bulat positif')
      )
      continue
    }

    const rowValues = {
      unit_no: unitNo,
      hm_unit: hmUnitRaw,
      wh_day: whDayRaw,
      date_hm: dateRaw
    }

    const parsed = hourMeterSchema.safeParse({
      fleetUnitId: equipment.fleetUnitId,
      hmUnit: Number(hmUnitRaw),
      whDay: Number(whDayRaw),
      dateHm
    })

    if (!parsed.success) {
      errors.push(...hmImportErrorsFromZod(rowNumber, rowValues, parsed.error))
      continue
    }

    try {
      const result = await upsertHourMeterFromImport(session, parsed.data, {
        idHm: idHm && !Number.isNaN(idHm) ? idHm : null,
        createdBy: Number(session.user.id) || undefined
      })

      imported += 1
      if (result.action === 'created') created += 1
      if (result.action === 'updated') updated += 1
      if (result.action === 'restored') restored += 1
    } catch (error) {
      errors.push(
        hmImportError(
          rowNumber,
          'data',
          null,
          error instanceof Error ? error.message : 'Gagal menyimpan data hour meter'
        )
      )
    }
  }

  if (imported === 0) {
    return NextResponse.json(
      {
        error: 'Tidak ada baris valid yang berhasil diimport',
        imported: 0,
        created: 0,
        updated: 0,
        restored: 0,
        errors
      },
      { status: 400 }
    )
  }

  logActivity({
    session,
    logName: 'hour-meters',
    event: 'updated',
    description: `imported hour meters (${imported} rows)`,
    subjectType: 'HourMeter',
    properties: { imported, created, updated, restored, errorCount: errors.length }
  })

  return NextResponse.json({ imported, created, updated, restored, errors })
}
