import { execSync } from 'child_process'

export type MysqlConnection = {
  user: string
  password: string
  host: string
  port: string
  database: string
}

export function parseMysqlUrl(dbUrl: string): MysqlConnection {
  const match = dbUrl.match(/mysql:\/\/([^:]*):([^@]*)@([^:/]+):(\d+)\/(.+)/)

  if (!match) {
    throw new Error('Database URL must look like mysql://user:pass@host:3306/dbname')
  }

  const [, user, password, host, port, database] = match

  return { user, password, host, port, database }
}

function buildMysqlCommand(connection: MysqlConnection, sql: string, database?: string) {
  const db = database ?? connection.database
  const auth = connection.password ? `-p${connection.password}` : ''

  return `mysql -u ${connection.user} ${auth} -h ${connection.host} -P ${connection.port} ${db} -N -e "${sql.replace(/"/g, '\\"')}"`
}

export function mysqlExec(
  connection: MysqlConnection,
  sql: string,
  options?: { database?: string }
): string {
  const command = buildMysqlCommand(connection, sql, options?.database)

  return execSync(command, {
    encoding: 'utf8',
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
  }).trim()
}

export function queryLegacyRows(connection: MysqlConnection, sql: string): string[][] {
  const db = connection.database
  const auth = connection.password ? `-p${connection.password}` : ''
  const command = `mysql -u ${connection.user} ${auth} -h ${connection.host} -P ${connection.port} ${db} -N -B -e "${sql.replace(/"/g, '\\"')}"`

  const output = execSync(command, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
  }).trim()

  if (!output) return []

  return output.split(/\r?\n/).map(line => line.split('\t'))
}

/** Paginate large legacy tables by numeric primary key. */
export function* queryLegacyRowsById(
  connection: MysqlConnection,
  table: string,
  idColumn: string,
  columns: string,
  pageSize = 20000
): Generator<string[][], void, unknown> {
  let afterId = 0

  for (;;) {
    const sql = `SELECT ${columns} FROM \`${table}\` WHERE ${idColumn} > ${afterId} ORDER BY ${idColumn} LIMIT ${pageSize}`
    const page = queryLegacyRows(connection, sql)

    if (page.length === 0) return

    afterId = Number(page[page.length - 1][0])
    yield page

    if (page.length < pageSize) return
  }
}

export function legacyTableExists(connection: MysqlConnection, tableName: string): boolean {
  const result = mysqlExec(
    connection,
    `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${connection.database}' AND table_name='${tableName}'`
  )

  return Number(result) > 0
}
