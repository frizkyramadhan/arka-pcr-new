/**
 * REST collection endpoint: GET /api/permissions (list), POST /api/permissions (create).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  createPermission,
  listPermissions,
  parsePermissionListQuery,
  PermissionServiceError
} from '@/lib/permissions/service'
import { permissionCreateSchema } from '@/lib/validations/permission'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

async function requirePermissionsAccess(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'permissions.access')
  if (forbidden) return forbidden

  return session
}

export async function GET(request: NextRequest) {
  const auth = await requirePermissionsAccess(request)
  if (auth instanceof NextResponse) return auth

  const query = parsePermissionListQuery(request.nextUrl.searchParams)
  const result = await listPermissions(query)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requirePermissionsAccess(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const parsed = permissionCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const permission = await createPermission(parsed.data)

    return NextResponse.json(permission, { status: 201 })
  } catch (error) {
    if (error instanceof PermissionServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    throw error
  }
}
