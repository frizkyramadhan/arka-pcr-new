/**
 * API tokens for other applications (spec section 17 KPI API).
 *
 * - An admin creates a token for a user; the plain token is returned once and only its SHA-256 hash is stored.
 * - A request with `Authorization: Bearer <token>` acts as that user: same site scope and permissions,
 *   read fresh from the database on every call (role changes apply immediately).
 * - Tokens can expire and can be revoked; revoked tokens stay in the table for audit.
 */
import { createHash, randomBytes } from 'crypto'

import type { Session } from 'next-auth'

import { logActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { getUserRolesAndPermissions } from '@/lib/rbac/defaults'
import { getUserProjectCodes } from '@/lib/rbac/user-projects'

/** Plain tokens look like `arka_<43 base64url chars>`; the prefix makes leaked tokens easy to recognise. */
const TOKEN_PREFIX = 'arka_'

/** Characters of the token kept in plain text so admins can tell tokens apart. */
const VISIBLE_PREFIX_LENGTH = 12

/** Expiry choices offered on the admin page (days); null = never expires. */
export const TOKEN_EXPIRY_DAYS = [30, 90, 180, 365] as const

/** last_used_at is written at most once per this interval per token, so polling clients do not write on every call. */
const LAST_USED_WRITE_INTERVAL_MS = 60_000

export type ApiTokenStatus = 'active' | 'expired' | 'revoked'

export type ApiTokenDto = {
  id: string
  name: string
  tokenPrefix: string
  status: ApiTokenStatus
  user: { id: number; username: string; name: string; isActive: boolean }
  expiresAt: string | null
  lastUsedAt: string | null
  lastUsedIp: string | null
  revokedAt: string | null
  createdBy: string | null
  createdAt: string
}

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string }

export const hashApiToken = (token: string) => createHash('sha256').update(token).digest('hex')

const userSelect = { select: { idUser: true, username: true, fullName: true, isActive: true } }

const statusOf = (row: { revokedAt: Date | null; expiresAt: Date | null }, now = new Date()): ApiTokenStatus =>
  row.revokedAt ? 'revoked' : row.expiresAt && row.expiresAt <= now ? 'expired' : 'active'

function mapRow(row: {
  id: string
  name: string
  tokenPrefix: string
  expiresAt: Date | null
  lastUsedAt: Date | null
  lastUsedIp: string | null
  revokedAt: Date | null
  createdAt: Date
  user: { idUser: number; username: string; fullName: string | null; isActive: boolean }
  createdBy: { username: string; fullName: string | null } | null
}): ApiTokenDto {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    status: statusOf(row),
    user: { id: row.user.idUser, username: row.user.username, name: row.user.fullName || row.user.username, isActive: row.user.isActive },
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    lastUsedIp: row.lastUsedIp,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdBy: row.createdBy ? row.createdBy.fullName || row.createdBy.username : null,
    createdAt: row.createdAt.toISOString()
  }
}

const listInclude = { user: userSelect, createdBy: { select: { username: true, fullName: true } } }

/** Every token, newest first (admin page). */
export async function listApiTokens(): Promise<ApiTokenDto[]> {
  const rows = await prisma.apiToken.findMany({ include: listInclude, orderBy: { createdAt: 'desc' } })

  return rows.map(mapRow)
}

/** Active users a token can be issued for (admin page select). */
export async function listTokenUsers() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { idUser: true, username: true, fullName: true },
    orderBy: { username: 'asc' }
  })

  return users.map(user => ({ id: user.idUser, username: user.username, name: user.fullName || user.username }))
}

/** Creates a token and returns the plain value once; it cannot be read again afterwards. */
export async function createApiToken(
  input: { userId?: unknown; name?: unknown; expiresInDays?: unknown },
  createdById: number | null
): Promise<Result<{ token: string; record: ApiTokenDto }>> {
  const userId = Number(input.userId)
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const days = input.expiresInDays == null || input.expiresInDays === '' ? null : Number(input.expiresInDays)

  if (!Number.isInteger(userId) || userId <= 0) return { ok: false, status: 400, error: 'Choose a user' }
  if (!name || name.length > 100) return { ok: false, status: 400, error: 'Name is required (max 100 characters)' }
  if (days !== null && !(TOKEN_EXPIRY_DAYS as readonly number[]).includes(days)) {
    return { ok: false, status: 400, error: `Expiry must be one of ${TOKEN_EXPIRY_DAYS.join(', ')} days or never` }
  }

  const user = await prisma.user.findUnique({ where: { idUser: userId }, select: { idUser: true, username: true, isActive: true } })
  if (!user || !user.isActive) return { ok: false, status: 400, error: 'User not found or inactive' }

  const token = `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
  const expiresAt = days ? new Date(Date.now() + days * 86_400_000) : null

  const row = await prisma.apiToken.create({
    data: {
      userId,
      name,
      tokenPrefix: token.slice(0, VISIBLE_PREFIX_LENGTH),
      tokenHash: hashApiToken(token),
      expiresAt,
      createdById
    },
    include: listInclude
  })

  logActivity({
    causerId: createdById,
    logName: 'api-tokens',
    event: 'created',
    description: `created API token "${name}" for ${user.username}`,
    subjectType: 'ApiToken',
    properties: { entityId: row.id, userId, tokenPrefix: row.tokenPrefix, expiresAt: expiresAt?.toISOString() ?? null }
  })

  return { ok: true, value: { token, record: mapRow(row) } }
}

/** Revokes a token; requests using it fail from now on. */
export async function revokeApiToken(id: string, revokedById: number | null): Promise<Result<ApiTokenDto>> {
  const existing = await prisma.apiToken.findUnique({ where: { id }, include: listInclude })
  if (!existing) return { ok: false, status: 404, error: 'Token not found' }
  if (existing.revokedAt) return { ok: true, value: mapRow(existing) }

  const row = await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() }, include: listInclude })

  logActivity({
    causerId: revokedById,
    logName: 'api-tokens',
    event: 'revoked',
    description: `revoked API token "${row.name}" of ${row.user.username}`,
    subjectType: 'ApiToken',
    properties: { entityId: row.id, userId: row.userId, tokenPrefix: row.tokenPrefix }
  })

  return { ok: true, value: mapRow(row) }
}

export type ApiTokenAuthFailure = 'invalid' | 'revoked' | 'expired' | 'user_inactive'

/**
 * Resolves a Bearer token to a session of its owner. Site scope and permissions come from the database,
 * exactly like a browser session (`hydrateSessionFromDb` in `lib/utils/api-auth.ts`).
 */
export async function authenticateApiToken(
  token: string,
  ip: string | null
): Promise<{ ok: true; session: Session; tokenId: string } | { ok: false; reason: ApiTokenAuthFailure }> {
  if (!token.startsWith(TOKEN_PREFIX)) return { ok: false, reason: 'invalid' }

  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hashApiToken(token) }, include: { user: userSelect } })
  if (!row) return { ok: false, reason: 'invalid' }

  const now = new Date()
  const status = statusOf(row, now)
  if (status !== 'active') return { ok: false, reason: status }
  if (!row.user.isActive) return { ok: false, reason: 'user_inactive' }

  if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS || row.lastUsedIp !== ip) {
    void prisma.apiToken
      .update({ where: { id: row.id }, data: { lastUsedAt: now, lastUsedIp: ip?.slice(0, 45) ?? null } })
      .catch(error => console.error('[api-tokens] failed to update last_used_at:', error instanceof Error ? error.message : error))
  }

  const [projectCodes, { roleNames, permissions }] = await Promise.all([
    getUserProjectCodes(row.user.idUser),
    getUserRolesAndPermissions(row.user.idUser)
  ])

  return {
    ok: true,
    tokenId: row.id,
    session: {
      user: {
        id: String(row.user.idUser),
        name: row.user.fullName || row.user.username,
        email: null,
        projectCodes,
        roles: roleNames,
        permissions
      },
      expires: row.expiresAt?.toISOString() ?? ''
    }
  }
}
