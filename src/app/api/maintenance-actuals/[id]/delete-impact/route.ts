/**
 * GET /api/maintenance-actuals/[id]/delete-impact — counts shown before deleting an actual:
 * findings recorded on it, photos on the actual, and photos on those findings.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getMaintenanceActualDeleteImpact } from '@/lib/fms/maintenance-actuals'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.delete')
  if (forbidden) return forbidden

  const impact = await getMaintenanceActualDeleteImpact(params.id)
  if (!impact) {
    return NextResponse.json({ error: 'Maintenance actual not found' }, { status: 404 })
  }

  return NextResponse.json(impact)
}
