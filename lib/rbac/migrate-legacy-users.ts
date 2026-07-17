/**

 * Assign default job role when user has no roles (post RBAC simplification).

 */

import { prisma } from '@/lib/prisma'



async function getRoleIdByName(name: string): Promise<number | null> {

  const role = await prisma.role.findFirst({

    where: { name, deletedAt: null, isActive: true },

    select: { idRole: true }

  })



  return role?.idRole ?? null

}



/** Assign roles for users without user_roles. */

export async function migrateLegacyUserRoles(idUser: number): Promise<string[]> {

  const existing = await prisma.userRole.count({

    where: {

      idUser,

      role: { isActive: true, deletedAt: null }

    }

  })

  if (existing > 0) return []



  const user = await prisma.user.findUnique({

    where: { idUser },

    select: { username: true }

  })



  if (!user) return []



  const roleNames = user.username === 'admin' ? ['administrator'] : ['plant_foreman']

  const assigned: string[] = []



  for (const roleName of roleNames) {

    const idRole = await getRoleIdByName(roleName)

    if (!idRole) continue



    await prisma.userRole.upsert({

      where: { idUser_idRole: { idUser, idRole } },

      create: { idUser, idRole },

      update: {}

    })

    assigned.push(roleName)

  }



  return assigned

}



export async function migrateAllLegacyUsers(): Promise<{ migrated: number }> {

  const users = await prisma.user.findMany({

    where: { isActive: true },

    select: { idUser: true }

  })



  let migrated = 0



  for (const user of users) {

    const assigned = await migrateLegacyUserRoles(user.idUser)

    if (assigned.length > 0) migrated += 1

  }



  return { migrated }

}


