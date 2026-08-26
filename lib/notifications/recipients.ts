/**
 * Resolve penerima email dari RBAC (permission + optional project scope).
 */

import { prisma } from '@/lib/prisma'
import type { MailRecipient } from '@/lib/notifications/types'
import { HEAD_OFFICE_CODE } from '@/lib/utils/project-scope'

const emailUserSelect = {
  idUser: true,
  email: true,
  fullName: true,
  username: true
} as const

function toRecipient(user: {
  idUser: number
  email: string | null
  fullName: string | null
}): MailRecipient | null {
  if (!user.email?.trim()) return null

  return {
    idUser: user.idUser,
    email: user.email.trim(),
    fullName: user.fullName
  }
}

/** User aktif yang punya salah satu permission code, opsional filter project. */
export async function findUsersByPermission(
  permissionCode: string | string[],
  options: { projectCode?: string | null } = {}
): Promise<MailRecipient[]> {
  const codes = Array.isArray(permissionCode) ? permissionCode : [permissionCode]
  if (codes.length === 0) return []

  const projectCode = options.projectCode?.trim() || null

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      email: { not: null },
      userRoles: {
        some: {
          role: {
            isActive: true,
            rolePermissions: {
              some: {
                permission: { code: { in: codes } }
              }
            }
          }
        }
      },
      ...(projectCode
        ? {
            // Site project match, or HO (000H) sees all projects
            userProjects: {
              some: {
                projectCode: { in: [projectCode, HEAD_OFFICE_CODE] }
              }
            }
          }
        : {})
    },
    select: emailUserSelect
  })

  const seen = new Set<string>()
  const recipients: MailRecipient[] = []

  for (const user of users) {
    const recipient = toRecipient(user)
    if (!recipient) continue
    const key = recipient.email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    recipients.push(recipient)
  }

  return recipients
}

export async function findUserRecipientById(idUser: number | null | undefined): Promise<MailRecipient | null> {
  if (!idUser) return null

  const user = await prisma.user.findFirst({
    where: { idUser, isActive: true },
    select: emailUserSelect
  })

  if (!user) return null

  return toRecipient(user)
}

export async function findUsersByIds(ids: number[]): Promise<MailRecipient[]> {
  const unique = [...new Set(ids.filter(id => Number.isFinite(id) && id > 0))]
  if (unique.length === 0) return []

  const users = await prisma.user.findMany({
    where: { idUser: { in: unique }, isActive: true, email: { not: null } },
    select: emailUserSelect
  })

  return users.map(toRecipient).filter((row): row is MailRecipient => Boolean(row))
}
