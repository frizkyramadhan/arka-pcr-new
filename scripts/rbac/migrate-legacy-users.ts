/**
 * One-time RBAC seed + assign roles to users without user_roles.
 * Run before applying migration that drops legacy user columns.
 */
import { ensureDefaultRbacSetup, migrateAllLegacyUsers } from '@/lib/rbac/defaults'

async function main() {
  await ensureDefaultRbacSetup()
  const result = await migrateAllLegacyUsers()
  console.log(`RBAC setup complete. Users migrated: ${result.migrated}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
