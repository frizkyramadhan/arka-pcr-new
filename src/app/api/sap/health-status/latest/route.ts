/** Baris terakhir sap_health_check_log — dasar banner in-app saat SAP B1 down. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const latest = await prisma.sapHealthCheckLog.findFirst({
    orderBy: { checkedAt: 'desc' }
  })

  return NextResponse.json({ data: latest })
}
