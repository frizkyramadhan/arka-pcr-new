import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listModelsForSession } from '@/lib/fleet-api/equipment-service'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const models = await listModelsForSession()

  return NextResponse.json(models)
}
