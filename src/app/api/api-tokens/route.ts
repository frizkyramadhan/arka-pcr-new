/**
 * GET  /api/api-tokens — every API token plus the active users a token can be issued for (System → API Tokens).
 * POST /api/api-tokens — create a token `{ userId, name, expiresInDays: 30|90|180|365|null }`;
 *                        the response carries the plain token once.
 * Permissions: system.access + api-tokens.read (GET) / api-tokens.create (POST).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createApiToken, listApiTokens, listTokenUsers, TOKEN_EXPIRY_DAYS } from '@/lib/api-tokens'
import { requireSession, requireSystemPermissionOrForbidden } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'api-tokens.read')
  if (forbidden) return forbidden

  const [tokens, users] = await Promise.all([listApiTokens(), listTokenUsers()])

  return NextResponse.json({ tokens, users, expiryDays: TOKEN_EXPIRY_DAYS })
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireSystemPermissionOrForbidden(session, 'api-tokens.create')
  if (forbidden) return forbidden

  const body = await request.json().catch(() => ({}))
  const result = await createApiToken(body, Number(session.user.id) || null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(result.value, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
