/**
 * SAP failure-code lookups for the maintenance actual form.
 * kind=components | damages | sub-components (sub-components needs componentCode).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isSapB1Enabled } from '@/lib/sap-b1/client'
import { SapB1DisabledError } from '@/lib/sap-b1/config'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { listFailureComponents, listFailureDamages, listFailureSubComponents } from '@/lib/sap-b1/failure-codes'
import { requireAnyPermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'maintenance-actual.read',
    'maintenance-actual.create',
    'maintenance-actual.update'
  ])
  if (forbidden) return forbidden

  if (!isSapB1Enabled()) {
    return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: [] }, { status: 503 })
  }

  const kind = request.nextUrl.searchParams.get('kind')?.trim() ?? ''
  const componentCode = request.nextUrl.searchParams.get('componentCode')?.trim() ?? ''

  try {
    if (kind === 'components') {
      return NextResponse.json({ data: await listFailureComponents(), source: 'sap-b1' })
    }
    if (kind === 'damages') {
      return NextResponse.json({ data: await listFailureDamages(), source: 'sap-b1' })
    }
    if (kind === 'sub-components') {
      if (!componentCode) {
        return NextResponse.json({ error: 'componentCode is required', data: [] }, { status: 400 })
      }

      return NextResponse.json({ data: await listFailureSubComponents(componentCode), source: 'sap-b1' })
    }

    return NextResponse.json({ error: 'kind must be components, damages, or sub-components', data: [] }, { status: 400 })
  } catch (error) {
    if (error instanceof SapB1DisabledError) {
      return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: [] }, { status: 503 })
    }

    return NextResponse.json(
      {
        error: toFriendlySapErrorMessage(error, 'Failed to read SAP failure codes.'),
        data: []
      },
      { status: 502 }
    )
  }
}
