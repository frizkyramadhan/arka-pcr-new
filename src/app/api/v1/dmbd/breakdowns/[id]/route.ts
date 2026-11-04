/**
 * GET /api/v1/dmbd/breakdowns/{id}/
 * One breakdown + activities for other applications (read-only).
 * Auth: Bearer API token (breakdown.read). Docs: docs/dmbd-api.md.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { API_VERSION, apiError, apiJson, authenticateDmbdApi, mapBreakdownDetail } from '@/lib/dmbd/api-v1'
import { getBreakdownDetail } from '@/lib/dmbd/list'
import { canAccessProject } from '@/lib/utils/project-scope'

type RouteContext = { params: { id: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await authenticateDmbdApi(request)
  if (session instanceof NextResponse) return session

  const { id } = context.params
  if (!id?.trim()) return apiError(400, 'INVALID_PARAMETER', 'id is required')

  try {
    const row = await getBreakdownDetail(id)
    if (!row) return apiError(404, 'NOT_FOUND', 'Breakdown was not found')
    if (!canAccessProject(session, row.projectCode)) {
      return apiError(403, 'SITE_FORBIDDEN', 'You cannot view this breakdown')
    }

    return apiJson({
      data: mapBreakdownDetail(row as unknown as Record<string, unknown>),
      generated_at: new Date().toISOString(),
      api_version: API_VERSION
    })
  } catch (error) {
    console.error('[api/v1/dmbd/breakdowns/:id]', error)

    return apiError(500, 'SERVER_ERROR', 'Failed to load breakdown')
  }
}
