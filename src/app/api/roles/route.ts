/**
 * REST collection endpoint: GET /api/roles (list), POST /api/roles (create).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createRole, listRoles, parseRoleListQuery, RoleServiceError } from '@/lib/roles/service'
import { roleCreateSchema } from '@/lib/validations/role'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

async function requireRolesAccess(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'roles.access')
  if (forbidden) return forbidden

  return session
}

export async function GET(request: NextRequest) {
  const auth = await requireRolesAccess(request)
  if (auth instanceof NextResponse) return auth

  const query = parseRoleListQuery(request.nextUrl.searchParams)
  const result = await listRoles(query)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireRolesAccess(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const parsed = roleCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const role = await createRole(parsed.data)

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    if (error instanceof RoleServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    throw error
  }
}
