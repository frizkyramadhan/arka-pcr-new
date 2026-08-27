import { migrationConfig } from './config'
import { mysqlExec, parseMysqlUrl } from './lib/mysql-cli'

const KEY_TABLES = [
  'user',
  'unit',
  'comp',
  'mod',
  'commod',
  'hm',
  'replacement',
  'sos',
  'inspection',
  'condition',
  'ba',
  'ba_caused',
  'ba_action',
  'ba_status',
  'kanibal',
  'project'
]

/**
 * Audit legacy staging DB after SQL import.
 * Usage: npm run migrate:audit-legacy
 */
async function main() {
  const connection = parseMysqlUrl(migrationConfig.legacyDatabaseUrl)

  console.log('ARKA PCR — Legacy schema audit\n')
  console.log(`Database: ${connection.database}@${connection.host}:${connection.port}\n`)

  const tablesRaw = await mysqlExec(connection, 'SHOW TABLES')
  const tables = tablesRaw ? tablesRaw.split(/\r?\n/).filter(Boolean) : []

  console.log(`Tables found: ${tables.length}`)
  if (tables.length === 0) {
    console.log('\nNo tables yet. Run: npm run migrate:import-legacy-sql')
    
return
  }

  console.log('\n--- All tables ---')
  tables.forEach(name => console.log(`  ${name}`))

  console.log('\n--- Key tables (UPGRADE_PLAN §14) ---')
  for (const name of KEY_TABLES) {
    const exists = tables.includes(name)
    console.log(`${exists ? '[OK]' : '[--]'} ${name}`)

    if (!exists) continue

    const columns = await mysqlExec(connection, `DESCRIBE \`${name}\``)
    const lines = columns.split(/\r?\n/).filter(Boolean)
    console.log(`     columns: ${lines.length}`)
  }

  if (tables.includes('unit')) {
    console.log('\n--- Sample units (for mapping CSV) ---')

    const sample = await mysqlExec(
      connection,
      'SELECT id_unit, unit_no, id_model FROM unit ORDER BY unit_no LIMIT 10'
    )
    sample.split(/\r?\n/).forEach(row => console.log(`  ${row.replace(/\t/g, ' | ')}`))
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
