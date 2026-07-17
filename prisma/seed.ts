import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { ensureDefaultRbacSetup } from '../lib/rbac/defaults'
import { syncUserProjects } from '../lib/rbac/user-projects'

const prisma = new PrismaClient()

async function main() {
  await ensureDefaultRbacSetup()

  const passwordHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      password: passwordHash,
      fullName: 'Administrator',
      isActive: true
    },
    update: {
      password: passwordHash,
      isActive: true
    }
  })

  await syncUserProjects(admin.idUser, ['000H'])

  const adminRole = await prisma.role.findFirst({ where: { name: 'admin', deletedAt: null } })
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { idUser_idRole: { idUser: admin.idUser, idRole: adminRole.idRole } },
      create: { idUser: admin.idUser, idRole: adminRole.idRole },
      update: {}
    })
  }

  const lookupData = [
    { caused: 'Wear' },
    { caused: 'Fatigue' },
    { caused: 'Contamination' },
    { caused: 'Other' }
  ]

  for (const item of lookupData) {
    const existing = await prisma.baCaused.findFirst({ where: { caused: item.caused } })
    if (!existing) {
      await prisma.baCaused.create({ data: item })
    }
  }

  const actionData = [{ action: 'Repair' }, { action: 'Replace' }, { action: 'Overhaul' }]
  for (const item of actionData) {
    const existing = await prisma.baAction.findFirst({ where: { action: item.action } })
    if (!existing) {
      await prisma.baAction.create({ data: item })
    }
  }

  const statusData = [{ status: 'Good' }, { status: 'Damaged' }, { status: 'Worn' }]
  for (const item of statusData) {
    const existing = await prisma.baComponentStatus.findFirst({ where: { status: item.status } })
    if (!existing) {
      await prisma.baComponentStatus.create({ data: item })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
