/**
 * GET /api/breakdowns/lookups — SAP lists for the breakdown form.
 * Read-only. Pass componentCode to also load that component's sub components.
 * scope=staff with projectCode returns operators, mechanics, and assignees for that project.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  BREAKDOWN_LOCATIONS,
  listActivityMasters,
  listFailureCauses,
  listJobCategories,
  listJobCodes,
  listProjectPeople
} from '@/lib/dmbd/sap'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { listFailureComponents, listFailureDamages, listFailureSubComponents } from '@/lib/sap-b1/failure-codes'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'breakdown.read')
  if (forbidden) return forbidden

  const componentCode = request.nextUrl.searchParams.get('componentCode')?.trim() ?? ''
  const projectCode = request.nextUrl.searchParams.get('projectCode')?.trim() ?? ''
  const scope = request.nextUrl.searchParams.get('scope')?.trim() ?? ''

  if (scope === 'staff') {
    try {
      const people = await listProjectPeople(projectCode)

      return NextResponse.json({ ...people, lookupErrors: {} })
    } catch (error) {
      return NextResponse.json({
        operators: [],
        mechanics: [],
        users: [],
        lookupErrors: {
          staff: toFriendlySapErrorMessage(error, 'Project staff could not be loaded from SAP.')
        }
      })
    }
  }

  // One SAP call at a time. Parallel GETs to Service Layer hang and hit SAP_B1_TIMEOUT_MS.
  const loaders: Array<[string, () => Promise<unknown>]> = [
    ['activities', listActivityMasters],
    ['components', listFailureComponents],
    ['jobCategories', listJobCategories],
    ['jobCodes', listJobCodes],
    ['damages', listFailureDamages],
    ['causes', listFailureCauses],
    ['locations', async () => BREAKDOWN_LOCATIONS],
    ['subComponents', async () => (componentCode ? listFailureSubComponents(componentCode) : [])]
  ]

  const body: Record<string, unknown> = {}
  const lookupErrors: Record<string, string> = {}
  for (const [key, load] of loaders) {
    try {
      body[key] = await load()
    } catch (error) {
      body[key] = []
      lookupErrors[key] = toFriendlySapErrorMessage(error, `${key} could not be loaded from SAP.`)
    }
  }

  return NextResponse.json({ ...body, lookupErrors })
}
