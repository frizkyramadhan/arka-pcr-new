import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  deleteReplacementReport,
  getReplacementById,
  uploadReplacementReport
} from '@/lib/replacement/service'
import { requireAnyPermissionOrForbidden, requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { resolveStoredFilePath } from '@/lib/utils/file-storage'

type RouteContext = {
  params: { id: string }
}

async function requireReplacementReportPermission(session: Awaited<ReturnType<typeof requireSession>>, idRep: number) {
  if (session instanceof NextResponse) return session

  const existing = await getReplacementById(session, idRep)

  if (existing?.woStatus === 'CLOSE') {
    return requireAnyPermissionOrForbidden(session, ['system.admin', 'replacements.edit.close'])
  }

  return requirePermissionOrForbidden(session, 'replacements.update')
}

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idRep = Number(params.id)
  const forbidden = await requireReplacementReportPermission(session, idRep)
  if (forbidden) return forbidden

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  try {
    const row = await uploadReplacementReport(session, idRep, file)
    if (!row) return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idRep = Number(params.id)
  const forbidden = await requireReplacementReportPermission(session, idRep)
  if (forbidden) return forbidden

  try {
    const row = await deleteReplacementReport(session, idRep)
    if (!row) return NextResponse.json({ error: 'Replacement not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete report failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idRep = Number(params.id)
  const row = await getReplacementById(session, idRep)

  if (!row?.report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const filePath = resolveStoredFilePath(row.report)
  const fs = await import('fs')

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Report file missing on disk' }, { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="wo-${idRep}-report.pdf"`
    }
  })
}
