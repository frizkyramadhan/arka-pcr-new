import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { componentSchema } from '@/lib/validations/component'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

const MAX_FILE_SIZE = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024

function parseHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex(header => candidates.includes(header))
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'components.create')
  if (forbidden) return forbidden

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  if (!file.name.endsWith('.xlsx')) {
    return NextResponse.json({ error: 'Invalid file type. Upload .xlsx only.' }, { status: 400 })
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

  const descIndex = parseHeaderIndex(headers, ['comp_desc', 'component', 'description'])
  const typeIndex = parseHeaderIndex(headers, ['comp_type', 'type'])
  const statusIndex = parseHeaderIndex(headers, ['status'])

  if (descIndex === -1) {
    return NextResponse.json({ error: 'Missing comp_desc column in row 1' }, { status: 400 })
  }

  let imported = 0
  const errors: string[] = []

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const compDesc = String(row.getCell(descIndex + 1).value ?? '').trim()
    if (!compDesc) continue

    const compTypeRaw = typeIndex >= 0 ? row.getCell(typeIndex + 1).value : null
    const statusRaw = statusIndex >= 0 ? row.getCell(statusIndex + 1).value : 'Active'

    const parsed = componentSchema.safeParse({
      compDesc,
      compType: compTypeRaw ? String(compTypeRaw).trim() : null,
      status: String(statusRaw ?? 'Active').trim() === 'Inactive' ? 'Inactive' : 'Active'
    })

    if (!parsed.success) {
      errors.push(`Row ${rowNumber}: invalid data`)
      continue
    }

    const existing = await prisma.comp.findFirst({
      where: { compDesc: parsed.data.compDesc, deletedAt: null }
    })

    if (existing) {
      await prisma.comp.update({
        where: { idComp: existing.idComp },
        data: {
          compType: parsed.data.compType ?? null,
          status: parsed.data.status
        }
      })
    } else {
      await prisma.comp.create({
        data: {
          compDesc: parsed.data.compDesc,
          compType: parsed.data.compType ?? null,
          status: parsed.data.status
        }
      })
    }

    imported += 1
  }

  if (imported === 0) {
    return NextResponse.json({ error: 'No valid rows found', details: errors }, { status: 400 })
  }

  return NextResponse.json({ imported, errors })
}
