import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

/**
 * Import ba_caused, ba_action, ba_status lookup tables from legacy staging.
 * Usage: npm run migrate:import-ba-lookup
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  const tables = [
    { legacy: 'ba_caused', upsert: upsertBaCaused },
    { legacy: 'ba_action', upsert: upsertBaAction },
    { legacy: 'ba_status', upsert: upsertBaStatus }
  ] as const

  for (const { legacy, upsert } of tables) {
    if (!legacyTableExists(connection, legacy)) {
      console.warn(`Skip ${legacy}: table not found`)
      continue
    }

    const rows = queryLegacyRows(connection, `SELECT * FROM \`${legacy}\` ORDER BY 1`)
    let count = 0

    for (const cols of rows) {
      if (cols.length < 2) continue
      await upsert(Number(cols[0]), String(cols[1] ?? ''))
      count += 1
    }

    console.log(`${legacy}: ${count} row(s)`)
  }
}

async function upsertBaCaused(id: number, caused: string) {
  await prisma.baCaused.upsert({
    where: { idCaused: id },
    create: { idCaused: id, caused },
    update: { caused }
  })
}

async function upsertBaAction(id: number, action: string) {
  await prisma.baAction.upsert({
    where: { idAction: id },
    create: { idAction: id, action },
    update: { action }
  })
}

async function upsertBaStatus(id: number, status: string) {
  await prisma.baComponentStatus.upsert({
    where: { idStatus: id },
    create: { idStatus: id, status },
    update: { status }
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
