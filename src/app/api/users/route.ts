/**
 * REST collection endpoint: GET /api/users (list), POST /api/users (create).
 * Requires session + permission `users.access`.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createUser, listUsers, parseUserListQuery, UserServiceError } from '@/lib/users/service'
import { userCreateSchema } from '@/lib/validations/user'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

async function requireUsersAccess(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'users.access')
  if (forbidden) return forbidden

  return session
}

export async function GET(request: NextRequest) {
  const auth = await requireUsersAccess(request)
  if (auth instanceof NextResponse) return auth

  const query = parseUserListQuery(request.nextUrl.searchParams)
  const result = await listUsers(query)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireUsersAccess(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const parsed = userCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const user = await createUser(parsed.data, Number(auth.user.id) || undefined)

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof UserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    throw error
  }
}
