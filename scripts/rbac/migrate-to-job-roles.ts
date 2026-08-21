/**
 * Remap user_role from legacy role names to job-based role templates.
 */
import { prisma } from '@/lib/prisma'
import { ensureDefaultRbacSetup } from '@/lib/rbac/defaults'
import { LEGACY_ROLE_MIGRATION_MAP } from '@/lib/rbac/role-templates'

async function getRoleIdByName(name: string): Promise<number | null> {
  const role = await prisma.role.findFirst({
    where: { name, deletedAt: null, isActive: true },
    select: { idRole: true }
  })

  return role?.idRole ?? null
}

export async function migrateUsersToJobRoles(): Promise<{ usersUpdated: number; assignmentsAdded: number }> {
  await ensureDefaultRbacSetup()

  const newRoleIds = new Map<string, number>()
  for (const name of new Set(Object.values(LEGACY_ROLE_MIGRATION_MAP))) {
    const id = await getRoleIdByName(name)
    if (id) newRoleIds.set(name, id)
  }

  const legacyNames = Object.keys(LEGACY_ROLE_MIGRATION_MAP)

  const userRoles = await prisma.userRole.findMany({
    where: { role: { name: { in: legacyNames } } },
    include: { role: { select: { name: true } }, user: { select: { idUser: true } } }
  })

  const usersToUpdate = new Map<number, Set<string>>()

  for (const row of userRoles) {
    const targetName = LEGACY_ROLE_MIGRATION_MAP[row.role.name]
    if (!targetName) continue

    if (!usersToUpdate.has(row.idUser)) usersToUpdate.set(row.idUser, new Set())
    usersToUpdate.get(row.idUser)!.add(targetName)
  }

  let assignmentsAdded = 0

  for (const [idUser, targetNames] of usersToUpdate.entries()) {
    for (const targetName of targetNames) {
      const idRole = newRoleIds.get(targetName)
      if (!idRole) continue

      await prisma.userRole.upsert({
        where: { idUser_idRole: { idUser, idRole } },
        create: { idUser, idRole },
        update: {}
      })
      assignmentsAdded += 1
    }

    await prisma.userRole.deleteMany({
      where: {
        idUser,
        role: { name: { in: legacyNames } }
      }
    })
  }

  return { usersUpdated: usersToUpdate.size, assignmentsAdded }
}

async function main() {
  const result = await migrateUsersToJobRoles()
  console.log('Job role migration complete:', result)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

