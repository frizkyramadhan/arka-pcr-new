/**
 * GET /api/maintenance-actuals/next-register?projectId=&maintenanceDate=
 * Pratinjau nomor register untuk form. Nomor final tetap dialokasikan saat simpan.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { previewRegisterNo } from '@/lib/fms/maintenance-actuals'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'maintenance-actual.create',
    'maintenance-actual.update'
  ])
  if (forbidden) return forbidden

  const projectId = request.nextUrl.searchParams.get('projectId')?.trim() || ''
  const maintenanceDate = request.nextUrl.searchParams.get('maintenanceDate')?.trim() || ''
  if (!projectId || !maintenanceDate) {
    return NextResponse.json({ error: 'projectId and maintenanceDate are required' }, { status: 400 })
  }

  const registerNo = await previewRegisterNo(projectId, maintenanceDate)
  if (!registerNo) {
    return NextResponse.json({ error: 'maintenanceDate must be YYYY-MM-DD' }, { status: 400 })
  }

  return NextResponse.json({ registerNo })
}
