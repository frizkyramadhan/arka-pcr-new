/**
 * Cannibal Request By — candidate lookup and identity-gated confirm/reject.
 * Constants live in requestor-roles.ts so client validation does not import Prisma.
 */
import type { Session } from 'next-auth'

import {
  rbacRoleForRequestRole,
  type CannibalRequestRole
} from '@/lib/cannibal/requestor-roles'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/utils/api-auth'
import { HEAD_OFFICE_CODE } from '@/lib/utils/project-scope'

export {
  CANNIBAL_REQUEST_ROLES,
  CANNIBAL_REQUEST_ROLE_LABELS,
  CANNIBAL_REQUEST_ROLE_TO_RBAC,
  isCannibalRequestRole,
  isRequestorAssignmentComplete,
  rbacRoleForRequestRole,
  type CannibalRequestRole
} from '@/lib/cannibal/requestor-roles'

export function sessionUserId(session: Session): number | null {
  const id = Number(session.user?.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function isAssignedRequestor(session: Session, requestedBy: number | null | undefined): boolean {
  const id = sessionUserId(session)
  return Boolean(id && requestedBy && id === requestedBy)
}

export function canActAsCannibalRequestor(
  session: Session,
  requestedBy: number | null | undefined,
  statusBa?: string | null
): boolean {
  if (statusBa && statusBa !== 'PENDING_REQUESTOR') return false
  if (!hasPermission(session, 'cannibals.access')) return false

  return isAssignedRequestor(session, requestedBy)
}

export type RequestorCandidate = {
  idUser: number
  username: string
  fullName: string | null
}

export async function listRequestorCandidates(
  role: CannibalRequestRole,
  projectCode: string
): Promise<RequestorCandidate[]> {
  const roleName = rbacRoleForRequestRole(role)
  const code = projectCode.trim()
  if (!code) return []

  return prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: {
          role: { name: roleName, isActive: true, deletedAt: null }
        }
      },
      userProjects: {
        some: {
          projectCode: { in: [code, HEAD_OFFICE_CODE] }
        }
      }
    },
    select: { idUser: true, username: true, fullName: true },
    orderBy: [{ fullName: 'asc' }, { username: 'asc' }]
  })
}

export async function assertValidRequestorAssignment(input: {
  cannibalRequestRole: CannibalRequestRole
  requestedBy: number
  projectCode: string
}): Promise<void> {
  const candidates = await listRequestorCandidates(input.cannibalRequestRole, input.projectCode)
  if (!candidates.some(user => user.idUser === input.requestedBy)) {
    throw new Error('Selected requestor does not hold the chosen jabatan for this project')
  }
}