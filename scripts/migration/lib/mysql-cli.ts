import { PrismaClient } from '@prisma/client'

export type MysqlConnection = {
  user: string
  password: string
  host: string
  port: string
  database: string
}

const legacyClients = new Map<string, PrismaClient>()

function sqlValueToString(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')

    return `${y}-${m}-${d}`
  }
  if (typeof value === 'bigint') return String(value)
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  return String(value)
}

function connectionUrl(connection: MysqlConnection): string {
  const pass = connection.password ? `:${connection.password}` : ':'

  return `mysql://${connection.user}${pass}@${connection.host}:${connection.port}/${connection.database}`
}

export function parseMysqlUrl(dbUrl: string): MysqlConnection {
  const match = dbUrl.match(/mysql:\/\/([^:]*):([^@]*)@([^:/]+):(\d+)\/(.+)/)

  if (!match) {
    throw new Error('Database URL must look like mysql://user:pass@host:3306/dbname')
  }

  const [, user, password, host, port, database] = match

  return { user, password, host, port, database }
}

async function prismaFor(connection: MysqlConnection): Promise<PrismaClient> {
  const url = connectionUrl(connection)
  const existing = legacyClients.get(url)
  if (existing) return existing

  const client = new PrismaClient({ datasources: { db: { url } } })
  await client.$executeRawUnsafe("SET SESSION sql_mode = ''")
  legacyClients.set(url, client)

  return client
}

export async function mysqlExec(
  connection: MysqlConnection,
  sql: string,
  _options?: { database?: string }
): Promise<string> {
  const client = await prismaFor(connection)
  const rows = await client.$queryRawUnsafe<Record<string, unknown>[]>(sql)
  if (!Array.isArray(rows) || rows.length === 0) return ''

  return rows
    .map(row => Object.values(row).map(sqlValueToString).join('\t'))
    .join('\n')
}

export async function queryLegacyRows(connection: MysqlConnection, sql: string): Promise<string[][]> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const client = await prismaFor(connection)
      const rows = await client.$queryRawUnsafe<Record<string, unknown>[]>(sql)
      if (!Array.isArray(rows) || rows.length === 0) return []

      return rows.map(row => Object.values(row).map(sqlValueToString))
    } catch (error) {
      lastError = error
      if (attempt === 4) break
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      const url = connectionUrl(connection)
      const stale = legacyClients.get(url)
      if (stale) {
        try {
          await stale.$disconnect()
        } catch {
          /* ignore */
        }
        legacyClients.delete(url)
      }
    }
  }

  throw lastError
}

/** Paginate large legacy tables by numeric primary key. */
export async function* queryLegacyRowsById(
  connection: MysqlConnection,
  table: string,
  idColumn: string,
  columns: string,
  pageSize = 20000
): AsyncGenerator<string[][], void, unknown> {
  let afterId = 0

  for (;;) {
    const sql = `SELECT ${columns} FROM \`${table}\` WHERE ${idColumn} > ${afterId} ORDER BY ${idColumn} LIMIT ${pageSize}`
    const page = await queryLegacyRows(connection, sql)

    if (page.length === 0) return

    afterId = Number(page[page.length - 1][0])
    yield page

    if (page.length < pageSize) return
  }
}

export async function legacyTableExists(connection: MysqlConnection, tableName: string): Promise<boolean> {
  const result = await mysqlExec(
    connection,
    `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${connection.database}' AND table_name='${tableName}'`
  )

  return Number(result) > 0
}
