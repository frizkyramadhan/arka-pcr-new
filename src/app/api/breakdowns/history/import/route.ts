/**
 * POST /api/breakdowns/history/import — seed breakdown history from daily-report Excel.
 * Multipart field `file`. Optional `projectCode` scopes unit lookup.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { importBreakdownHistory, parseHistoryWorkbook } from '@/lib/dmbd/history-sheet'
import { logBreakdownEvent } from '@/lib/dmbd/log'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { canAccessProject } from '@/lib/utils/project-scope'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.create')
  if (forbidden) return forbidden

  const userId = Number(session.user?.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Signed-in user is missing' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })

  const file = form.get('file')
  if (!file || typeof file === 'string' || !('arrayBuffer' in file)) {
    return NextResponse.json({ error: 'Choose an Excel file' }, { status: 400 })
  }

  const projectCode = String(form.get('projectCode') || '').trim()

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const rows = await parseHistoryWorkbook(buffer)
    if (!rows.length) return NextResponse.json({ error: 'No data rows found' }, { status: 400 })

    const result = await importBreakdownHistory(
      rows,
      userId,
      code => canAccessProject(session, code),
      projectCode || undefined
    )

    logBreakdownEvent({
      causerId: userId,
      event: 'imported',
      entityId: 'history-import',
      projectCode: projectCode || null,
      description: `Import history breakdown${projectCode ? ` (${projectCode})` : ''}: ${result.createdBreakdowns || 0} BD, ${result.createdActivities || 0} activity, ${result.skipped || 0} dilewati`,
      properties: {
        createdBreakdowns: result.createdBreakdowns,
        createdActivities: result.createdActivities,
        skipped: result.skipped,
        errors: Array.isArray(result.errors) ? result.errors.length : 0
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 400 }
    )
  }
}
