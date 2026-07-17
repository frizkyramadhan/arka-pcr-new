/**
 * Seed / sync permission catalog and role templates (manual — not on login).
 */
import { prisma } from '@/lib/prisma'
import { ensureDefaultRbacSetup } from '@/lib/rbac/defaults'

async function main() {
  await ensureDefaultRbacSetup()
  console.log('RBAC seed complete (permissions + role templates)')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
