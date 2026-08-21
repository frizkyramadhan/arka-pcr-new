import { prisma } from '@/lib/prisma'

import { migrationConfig } from './config'
import { legacyProjectIdToCode } from './lib/project-lookup'
import { legacyTableExists, parseMysqlUrl, queryLegacyRows } from './lib/mysql-cli'

function invalidDate(value: string | undefined): boolean {
  if (!value) return true
  const d = new Date(value)
  
return Number.isNaN(d.getTime()) || value.startsWith('0000')
}

/**
 * Import BA header records from legacy staging DB.
 * Usage: npm run migrate:import-ba
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  if (!legacyTableExists(connection, 'ba')) {
    console.error('Legacy table `ba` not found. Run migrate:import-legacy-sql first.')
    process.exit(1)
  }

  const userNameById = new Map<number, string>()
  if (legacyTableExists(connection, 'user')) {
    const users = queryLegacyRows(connection, 'SELECT id_user, username FROM user')
    for (const cols of users) {
      userNameById.set(Number(cols[0]), String(cols[1] ?? ''))
    }
  }

  const legacyRows = queryLegacyRows(
    connection,
    'SELECT id_ba, no_ba, id_project, posting_date, symptom, failure, id_caused, caused_other, id_status, status_other, id_action, mr_no, pr_no, po_no, status_ba, status_l1, user_l1, status_l2, user_l2, status_l3, user_l3 FROM ba ORDER BY id_ba'
  )

  let imported = 0
  let skipped = 0

  for (const columns of legacyRows) {
    if (columns.length < 10) continue

    const noBa = String(columns[1] ?? '').trim()
    if (!noBa) {
      skipped += 1
      continue
    }

    const exists = await prisma.ba.findUnique({ where: { noBa } })
    if (exists) {
      skipped += 1
      continue
    }

    const userLabel = (id: string | undefined) => {
      const n = Number(id)
      if (!Number.isFinite(n) || n <= 0) return null
      
return userNameById.get(n) ?? String(n)
    }

    const mr = columns[11]
    const pr = columns[12]
    const po = columns[13]

    await prisma.ba.create({
      data: {
        noBa,
        projectCode: legacyProjectIdToCode(columns[2]),
        postingDate: invalidDate(columns[3]) ? new Date('2015-01-01') : new Date(columns[3]),
        symptom: columns[4] ?? '',
        failure: columns[5] ?? '',
        idCaused: Number(columns[6]) || 1,
        causedOther: columns[7] ?? '',
        idStatus: Number(columns[8]) || 1,
        statusOther: columns[9] ?? '',
        idAction: Number(columns[10]) || 1,
        mrNo: mr && Number(mr) !== 0 ? String(mr) : null,
        prNo: pr && Number(pr) !== 0 ? String(pr) : null,
        poNo: po && Number(po) !== 0 ? String(po) : null,
        statusBa: columns[14] ? String(columns[14]).toUpperCase() : 'OPEN',
        statusL1: columns[15] ? String(columns[15]).toUpperCase() : 'PENDING',
        userL1: userLabel(columns[16]),
        statusL2: columns[17] ? String(columns[17]).toUpperCase() : 'PENDING',
        userL2: userLabel(columns[18]),
        statusL3: columns[19] ? String(columns[19]).toUpperCase() : 'PENDING',
        userL3: userLabel(columns[20])
      }
    })

    imported += 1
  }

  console.log(`BA import done: ${imported} imported, ${skipped} skipped.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
