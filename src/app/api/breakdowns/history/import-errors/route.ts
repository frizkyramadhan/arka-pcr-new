/**
 * POST /api/breakdowns/history/import-errors — Excel of row-level import errors.
 * Body: { errors: [{ row, message }] }
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { buildHistoryImportErrorWorkbook } from '@/lib/dmbd/history-sheet'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.create')
  if (forbidden) return forbidden

  const body = (await request.json().catch(() => null)) as { errors?: { row: number; message: string }[] } | null
  const errors = Array.isArray(body?.errors) ? body.errors : []
  if (!errors.length) return NextResponse.json({ error: 'No errors to export' }, { status: 400 })

  const buffer = await buildHistoryImportErrorWorkbook(errors)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="breakdown-import-errors.xlsx"'
    }
  })
}
