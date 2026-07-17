import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Session } from 'next-auth'

import { getServerSession } from 'next-auth'

import { isAclEnabled } from '@/lib/acl/config'
import { authOptions } from '@/lib/auth-options'
import { getUserRolesAndPermissions } from '@/lib/rbac/defaults'
import { getUserProjectCodes } from '@/lib/rbac/user-projects'
import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  getChainLevelOrder,
  PCR_FORECAST_APPROVAL_CHAIN
} from '@/lib/approval/registry'

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
}

function tokenToSession(token: Record<string, unknown>): Session {
  return {
    user: {
      id: String(token.sub ?? ''),
      name: (token.name as string | null) ?? null,
      email: (token.email as string | null) ?? null,
      projectCodes: (token.projectCodes as string[]) ?? [],
      roles: (token.roles as string[]) ?? [],
      permissions: (token.permissions as string[]) ?? []
    },
    expires: token.exp ? new Date(Number(token.exp) * 1000).toISOString() : ''
  }
}

/** App Router getToken does not re-run the jwt callback — refresh scope from DB on each API call. */
async function hydrateSessionFromDb(session: Session): Promise<Session> {
  const idUser = Number(session.user.id)
  if (!idUser || Number.isNaN(idUser)) return session

  const [projectCodes, { roleNames, permissions }] = await Promise.all([
    getUserProjectCodes(idUser),
    getUserRolesAndPermissions(idUser)
  ])

  return {
    ...session,
    user: {
      ...session.user,
      projectCodes,
      roles: roleNames,
      permissions
    }
  }
}

export async function requireSession(req?: NextRequest): Promise<Session | NextResponse> {
  if (req) {
    const token = await getToken({ req, secret: authSecret() })

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return hydrateSessionFromDb(tokenToSession(token as Record<string, unknown>))
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return hydrateSessionFromDb(session)
}

export function getSessionPermissions(session: Session): string[] {
  return Array.isArray(session.user.permissions) ? session.user.permissions : []
}

export function hasPermission(session: Session, permissionCode: string): boolean {
  if (!isAclEnabled()) {
    return true
  }

  const permissions = getSessionPermissions(session)

  if (permissions.includes('system.admin')) {
    return true
  }

  return permissions.includes(permissionCode)
}

export function hasAnyPermission(session: Session, permissionCodes: string[]): boolean {
  return permissionCodes.some(code => hasPermission(session, code))
}

/** @deprecated Use hasPermission(session, 'system.admin') */
export function isAdmin(session: Session): boolean {
  return hasPermission(session, 'system.admin')
}

/** @deprecated Use hasAnyPermission(session, ['system.admin', 'replacements.update']) */
export function isSuperUserOrAdmin(session: Session): boolean {
  return hasAnyPermission(session, ['system.admin', 'replacements.update'])
}

export function requirePermissionOrForbidden(session: Session, permissionCode: string) {
  if (!isAclEnabled()) {
    return null
  }

  if (hasPermission(session, permissionCode)) {
    return null
  }

  return forbiddenResponse('You do not have required permission')
}

export function requireAnyPermissionOrForbidden(session: Session, permissionCodes: string[]) {
  if (!isAclEnabled()) {
    return null
  }

  if (hasAnyPermission(session, permissionCodes)) {
    return null
  }

  return forbiddenResponse('You do not have required permission')
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

/** Forecast approval levels the session user may act on. */
export function getForecastApprovalLevels(session: Session): string[] {
  return getChainLevelOrder(PCR_FORECAST_APPROVAL_CHAIN).filter(level =>
    hasPermission(session, `forecasts.approve.${level}`)
  )
}

/** Cannibal BA approval levels the session user may act on. */
export function getCannibalApprovalLevels(session: Session): string[] {
  return getChainLevelOrder(CANNIBAL_BA_APPROVAL_CHAIN).filter(level =>
    hasPermission(session, `cannibals.approve.${level}`)
  )
}
