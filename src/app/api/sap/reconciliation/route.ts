/** List selisih status WO/PO SAP vs PCR (sap_reconciliation_log) — admin only. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  const status = request.nextUrl.searchParams.get('status') ?? 'open'

  const rows = await prisma.sapReconciliationLog.findMany({
    where: status === 'all' ? {} : { resolvedAt: status === 'resolved' ? { not: null } : null },
    orderBy: { detectedAt: 'desc' },
    take: 200,
    include: {
      replacement: {
        select: { idRep: true, unitNo: true, projectCode: true, woNo: true, poNo: true, woStatus: true }
      },
      resolver: { select: { idUser: true, fullName: true, username: true } }
    }
  })

  return NextResponse.json({ data: rows })
}
