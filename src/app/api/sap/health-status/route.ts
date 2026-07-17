/** Histori sap_health_check_log — dipakai halaman admin SAP Integration. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  const rows = await prisma.sapHealthCheckLog.findMany({
    orderBy: { checkedAt: 'desc' },
    take: 30
  })

  return NextResponse.json({ data: rows })
}
