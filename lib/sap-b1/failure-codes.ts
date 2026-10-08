/**
 * Failure codes from SAP B1 user-defined objects.
 * Component: MIS_COMPONENTNO. Sub component: its MIS_COMPONENTNOLCollection lines.
 * Damage: MIS_DAMAGE. Names are returned so the finding can store them at save time.
 */
import { isSapB1Configured, isSapB1Enabled, SapB1DisabledError, SapB1UnavailableError } from '@/lib/sap-b1/config'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'

export type SapFailureCode = {
  code: string
  name: string
}

export type ResolvedFailureCodes = {
  componentCode: string
  componentName: string
  subComponentCode: string
  subComponentName: string
  damageCode: string
  damageName: string
}

export class FailureCodeNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FailureCodeNotFoundError'
  }
}

type SapRow = Record<string, unknown>

const PAGE_SIZE = 100
const MAX_ROWS = 2000
const NAME_MAX = 100

function assertSapReady() {
  if (!isSapB1Enabled()) throw new SapB1DisabledError()
  if (!isSapB1Configured()) throw new SapB1UnavailableError('SAP B1 is not configured')
}

function isMissingRecord(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return /no matching records|does not exist/i.test(message)
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function clipName(value: string): string {
  return value.slice(0, NAME_MAX)
}

/** Blank or Y stays. N and any other flag are inactive. Canceled rows are skipped. */
function isActive(row: SapRow): boolean {
  if (text(row.Canceled).toUpperCase() === 'Y') return false
  const status = text(row.U_MIS_Status).toUpperCase()

  return status === '' || status === 'Y'
}

function entityKey(code: string): string {
  return encodeURIComponent(code.replace(/'/g, "''"))
}

async function readPages(path: string): Promise<SapRow[]> {
  const rows: SapRow[] = []

  for (let skip = 0; skip < MAX_ROWS; skip += PAGE_SIZE) {
    const joiner = path.includes('?') ? '&' : '?'
    const payload = await sapB1AuthorizedJson<{ value?: SapRow[] }>(`${path}${joiner}$top=${PAGE_SIZE}&$skip=${skip}`)
    const value = payload.value ?? []
    rows.push(...value)
    if (value.length < PAGE_SIZE) break
  }

  return rows
}

export async function listFailureComponents(): Promise<SapFailureCode[]> {
  assertSapReady()

  const rows = await readPages(
    '/MIS_COMPONENTNO?$select=Code,Name,U_MIS_ComponentDesc,U_MIS_Status,Canceled'
  )

  return rows.filter(isActive).map(row => ({
    code: text(row.Code),
    name: clipName(text(row.U_MIS_ComponentDesc) || text(row.Name))
  })).filter(row => row.code)
}

export async function listFailureDamages(): Promise<SapFailureCode[]> {
  assertSapReady()

  const rows = await readPages('/MIS_DAMAGE?$select=Code,Name,U_MIS_DamageName,U_MIS_Status,Canceled')

  return rows.filter(isActive).map(row => ({
    code: text(row.Code),
    name: clipName(text(row.U_MIS_DamageName) || text(row.Name))
  })).filter(row => row.code)
}

type ComponentDocument = {
  code: string
  name: string
  lines: SapFailureCode[]
}

async function loadComponent(code: string): Promise<ComponentDocument | null> {
  let row: SapRow
  try {
    row = await sapB1AuthorizedJson<SapRow>(`/MIS_COMPONENTNO('${entityKey(code)}')`)
  } catch (error) {
    if (isMissingRecord(error)) return null
    throw error
  }
  if (!row || !isActive(row)) return null

  const lines = Array.isArray(row.MIS_COMPONENTNOLCollection) ? row.MIS_COMPONENTNOLCollection : []

  return {
    code: text(row.Code),
    name: clipName(text(row.U_MIS_ComponentDesc) || text(row.Name)),
    lines: lines
      .filter((line): line is SapRow => Boolean(line) && typeof line === 'object')
      .filter(line => {
        const status = text(line.U_MIS_Status).toUpperCase()

        return status === '' || status === 'Y'
      })
      .map(line => ({
        code: text(line.U_MIS_CompNoLine),
        name: clipName(text(line.U_MIS_CompDesLine))
      }))
      .filter(line => line.code)
  }
}

export async function listFailureSubComponents(componentCode: string): Promise<SapFailureCode[]> {
  assertSapReady()

  const component = await loadComponent(componentCode)
  if (!component) return []

  return component.lines
}

/** Re-reads SAP so a saved finding stores the current code and name, not a typed string. */
export function createSapFailureCodeLookup() {
  const components = new Map<string, Promise<ComponentDocument | null>>()
  let damages: Promise<SapFailureCode[]> | null = null

  const component = (code: string) => {
    const key = code.trim()
    let pending = components.get(key)
    if (!pending) {
      pending = loadComponent(key).catch(error => {
        components.delete(key)
        throw error
      })
      components.set(key, pending)
    }

    return pending
  }

  return {
    async resolve(input: {
      componentCode: string
      subComponentCode: string
      damageCode: string
    }): Promise<ResolvedFailureCodes> {
      assertSapReady()

      const header = await component(input.componentCode)
      if (!header) throw new FailureCodeNotFoundError('Component code was not found in SAP')

      const sub = header.lines.find(line => line.code === input.subComponentCode.trim())
      if (!sub) throw new FailureCodeNotFoundError('Sub component code was not found for that component')

      if (!damages) damages = listFailureDamages()
      const damage = (await damages).find(row => row.code === input.damageCode.trim())
      if (!damage) throw new FailureCodeNotFoundError('Damage code was not found in SAP')

      return {
        componentCode: header.code,
        componentName: header.name,
        subComponentCode: sub.code,
        subComponentName: sub.name,
        damageCode: damage.code,
        damageName: damage.name
      }
    }
  }
}
