import { prisma } from '@/lib/prisma'
import { migrateLegacyUserRoles, migrateAllLegacyUsers } from '@/lib/rbac/migrate-legacy-users'
import { LEGACY_PERMISSION_CODES, PERMISSION_CATALOG } from '@/lib/rbac/permission-catalog'
import { LEGACY_ROLE_NAMES, ROLE_TEMPLATES, TEMPLATE_ROLE_NAMES } from '@/lib/rbac/role-templates'

export { PERMISSION_CATALOG, ALL_PERMISSION_CODES } from '@/lib/rbac/permission-catalog'

export { migrateLegacyUserRoles, migrateAllLegacyUsers } from '@/lib/rbac/migrate-legacy-users'

/** @deprecated Use ALL_PERMISSION_CODES */
export const BASIC_PERMISSION_CODES = [
  'users.access',
  'roles.access',
  'permissions.access',
  'units.access'
] as const

async function upsertPermissions() {
  const activeCodes = new Set(PERMISSION_CATALOG.map(item => item.code))

  for (const item of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        description: item.description,
        isActive: true
      },
      update: {
        description: item.description,
        deletedAt: null,
        isActive: true
      }
    })
  }

  for (const code of LEGACY_PERMISSION_CODES) {
    const legacyPermissions = await prisma.permission.findMany({
      where: { code },
      select: { idPermission: true }
    })

    if (legacyPermissions.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { idPermission: { in: legacyPermissions.map(row => row.idPermission) } }
      })
    }

    await prisma.permission.updateMany({
      where: { code },
      data: { isActive: false }
    })
  }

  await prisma.permission.updateMany({
    where: {
      code: { notIn: [...activeCodes, ...LEGACY_PERMISSION_CODES] },
      deletedAt: null
    },
    data: { isActive: false }
  })
}

async function upsertRoleTemplates() {
  const permissionRows = await prisma.permission.findMany({
    where: { deletedAt: null, isActive: true },
    select: { idPermission: true, code: true }
  })
  const permissionByCode = new Map(permissionRows.map(row => [row.code, row.idPermission]))

  for (const template of ROLE_TEMPLATES) {
    const role = await prisma.role.upsert({
      where: { name: template.name },
      create: {
        name: template.name,
        description: template.description,
        isActive: true
      },
      update: {
        description: template.description,
        deletedAt: null,
        isActive: true
      }
    })

    const validIds = template.permissionCodes
      .map(code => permissionByCode.get(code))
      .filter((id): id is number => typeof id === 'number')

    await prisma.rolePermission.deleteMany({ where: { idRole: role.idRole } })

    if (validIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: validIds.map(idPermission => ({ idRole: role.idRole, idPermission })),
        skipDuplicates: true
      })
    }
  }
}

async function deactivateLegacyRoles() {
  const legacyRoles = await prisma.role.findMany({
    where: { name: { in: [...LEGACY_ROLE_NAMES] } },
    select: { idRole: true }
  })

  if (legacyRoles.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { idRole: { in: legacyRoles.map(row => row.idRole) } }
    })
  }

  await prisma.role.updateMany({
    where: { name: { in: [...LEGACY_ROLE_NAMES] } },
    data: { isActive: false }
  })
}

async function ensureAdminUserRole() {
  const adminRole = await prisma.role.findFirst({
    where: { name: 'administrator', deletedAt: null },
    select: { idRole: true }
  })

  if (!adminRole) return

  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [{ username: 'admin' }],
      isActive: true
    },
    select: { idUser: true }
  })

  for (const user of adminUsers) {
    await prisma.userRole.upsert({
      where: {
        idUser_idRole: {
          idUser: user.idUser,
          idRole: adminRole.idRole
        }
      },
      create: {
        idUser: user.idUser,
        idRole: adminRole.idRole
      },
      update: {}
    })
  }
}

/** Sync permission catalog + role templates. Run via `npm run rbac:seed` or `db:seed` — not on login. */
export async function ensureDefaultRbacSetup() {
  await upsertPermissions()
  await upsertRoleTemplates()
  await deactivateLegacyRoles()
  await ensureAdminUserRole()
  await migrateAllLegacyUsers()
}

export async function getUserRolesAndPermissions(idUser: number) {
  await migrateLegacyUserRoles(idUser)

  const roles = await prisma.userRole.findMany({
    where: {
      idUser,
      role: { deletedAt: null, isActive: true }
    },
    select: {
      role: {
        select: {
          idRole: true,
          name: true,
          rolePermissions: {
            where: { permission: { deletedAt: null, isActive: true } },
            select: {
              permission: {
                select: {
                  code: true
                }
              }
            }
          }
        }
      }
    }
  })

  const roleNames = roles.map(item => item.role.name)

  const permissions = Array.from(
    new Set(roles.flatMap(item => item.role.rolePermissions.map(rp => rp.permission.code)))
  )

  if (permissions.includes('system.admin')) {
    return { roleNames, permissions: ['system.admin', ...permissions] }
  }

  return { roleNames, permissions }
}

export { TEMPLATE_ROLE_NAMES, LEGACY_ROLE_NAMES }
