/**
 * GET /api/forecasts/price-matrix — pivot sum of priceComponent by model/component × plan period.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listForecastPriceMatrix } from '@/lib/forecasts/service'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl

  const result = await listForecastPriceMatrix(session, {
    projectCode: searchParams.get('projectCode'),
    status: searchParams.get('status'),
    modelName: searchParams.get('modelName'),
    compDesc: searchParams.get('compDesc')
  })

  return NextResponse.json(result)
}
