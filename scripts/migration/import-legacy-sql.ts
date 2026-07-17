import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { migrationConfig } from './config'

/**
 * Import legacy SQL dump into LEGACY_DATABASE_URL (staging DB).
 * Place your dump at data/migration/legacy.sql or set LEGACY_SQL_PATH.
 *
 * Usage: npm run migrate:import-legacy-sql
 */
async function main() {
  const sqlPath = path.resolve(migrationConfig.legacySqlPath)

  if (!fs.existsSync(sqlPath)) {
    console.error(`Legacy SQL not found: ${sqlPath}`)
    console.error('Copy your dump to that path, then re-run this command.')
    process.exit(1)
  }

  const dbUrl = migrationConfig.legacyDatabaseUrl
  const match = dbUrl.match(/mysql:\/\/([^:]*):([^@]*)@([^:/]+):(\d+)\/(.+)/)

  if (!match) {
    console.error('LEGACY_DATABASE_URL must look like mysql://user:pass@host:3306/dbname')
    process.exit(1)
  }

  const [, user, password, host, port, database] = match

  console.log(`Importing ${sqlPath} → ${database}@${host}:${port}`)

  const createDb = `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  execSync(`mysql -u ${user} ${password ? `-p${password}` : ''} -h ${host} -P ${port} -e "${createDb}"`, {
    stdio: 'inherit',
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
  })

  // Dump SQLyog often hard-codes USE arka_pcr — rewrite to target database name.
  let sql = fs.readFileSync(sqlPath, 'utf8')
  sql = sql.replace(/CREATE DATABASE[^;]*`arka_pcr`/gi, `CREATE DATABASE IF NOT EXISTS \`${database}\``)
  sql = sql.replace(/USE\s+`arka_pcr`/gi, `USE \`${database}\``)

  const tempPath = path.join(path.dirname(sqlPath), `.import-${database}.sql`)
  fs.writeFileSync(tempPath, sql, 'utf8')

  try {
    execSync(`mysql -u ${user} ${password ? `-p${password}` : ''} -h ${host} -P ${port} ${database} < "${tempPath}"`, {
      stdio: 'inherit',
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
    })
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  }

  console.log('Legacy SQL import completed.')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
