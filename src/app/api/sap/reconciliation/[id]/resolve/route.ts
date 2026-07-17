/** Tandai satu baris sap_reconciliation_log sebagai reviewed — tidak menulis balik ke SAP. */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'system.admin')
  if (forbidden) return forbidden

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const idUser = Number(session.user.id)

  const existing = await prisma.sapReconciliationLog.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.sapReconciliationLog.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      resolvedBy: Number.isFinite(idUser) ? idUser : null
    }
  })

  return NextResponse.json({ data: updated })
}
