import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { bulkRefreshForecasts, generateForecasts } from '@/lib/forecasts/service'
import { forecastGenerateSchema } from '@/lib/validations/forecast'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { isHeadOffice } from '@/lib/utils/project-scope'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = forecastGenerateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await generateForecasts(session, parsed.data, Number(session.user.id) || undefined)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generate failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'forecasts.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const quarter = body.quarter ?? null
  const projectCode = isHeadOffice(session) ? body.projectCode ?? null : null

  try {
    const result = await bulkRefreshForecasts(session, { quarter, projectCode })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bulk refresh failed'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
