import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isSapB1Configured, isSapB1Enabled, pingSapB1 } from '@/lib/sap-b1/client'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const sap = await pingSapB1()

  return NextResponse.json({
    sap,
    sapEnabled: isSapB1Enabled(),
    sapConfigured: isSapB1Configured()
  })
}
