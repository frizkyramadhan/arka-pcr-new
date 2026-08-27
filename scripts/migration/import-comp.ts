import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

/**
 * Import comp master from legacy staging (preserve id_comp).
 * Usage: npm run migrate:import-comp
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!(await legacyTableExists(connection, 'comp'))) {
    console.error('Legacy table `comp` not found. Run migrate:import-legacy-sql first.')
    process.exit(1)
  }

  const rows = await queryLegacyRows(connection, 'SELECT id_comp, comp_desc, comp_type, status FROM comp ORDER BY id_comp')

  let imported = 0

  for (const cols of rows) {
    if (cols.length < 3) continue

    const idComp = Number(cols[0])
    const status = String(cols[3] ?? 'Active').trim() === 'Inactive' ? 'Inactive' : 'Active'

    await prisma.comp.upsert({
      where: { idComp },
      create: {
        idComp,
        compDesc: cols[1] ?? '',
        compType: cols[2] || null,
        status
      },
      update: {
        compDesc: cols[1] ?? '',
        compType: cols[2] || null,
        status
      }
    })
    imported += 1
  }

  console.log(`Comp import done: ${imported} row(s)`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
