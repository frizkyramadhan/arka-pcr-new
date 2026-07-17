import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'

/**
 * Hash plaintext passwords from legacy DB import.
 * Usage: tsx scripts/migrate-passwords.ts
 */
async function main() {
  const users = await prisma.user.findMany()

  let migrated = 0

  for (const user of users) {
    if (user.password.startsWith('$2')) continue

    const hash = await bcrypt.hash(user.password, 10)
    await prisma.user.update({
      where: { idUser: user.idUser },
      data: { password: hash }
    })
    migrated += 1
  }

  console.log(`Migrated ${migrated} password(s) to bcrypt`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
