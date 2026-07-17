/** SAP B1 Service Layer env config — server-side only (never NEXT_PUBLIC_*). */

const DEFAULT_BASE_URL = 'https://arkasrv2:50000/b1s/v1'

export function getSapB1BaseUrl(): string {
  const base = process.env.SAP_B1_BASE_URL?.trim() || DEFAULT_BASE_URL

  return base.replace(/\/+$/, '')
}

export function getSapB1CompanyDb(): string {
  return process.env.SAP_B1_COMPANY_DB?.trim() || 'SBO_ARKA_NEW'
}

export function getSapB1User(): string {
  return process.env.SAP_B1_USER?.trim() || 'manager'
}

export function getSapB1Password(): string {
  return process.env.SAP_B1_PASSWORD ?? ''
}

export function getSapB1TimeoutMs(): number {
  const raw = Number(process.env.SAP_B1_TIMEOUT_MS)

  return Number.isFinite(raw) && raw > 0 ? raw : 15_000
}

/** When false, accept self-signed / internal CA certs (typical on-prem B1). */
export function shouldRejectUnauthorizedTls(): boolean {
  const flag = process.env.SAP_B1_TLS_REJECT_UNAUTHORIZED

  if (flag === undefined || flag === '') return false

  return !['false', '0', 'no', 'off'].includes(flag.toLowerCase())
}

/** Optional spare-parts filter — comma-separated ItemsGroupCode values. */
export function getSapB1ItemGroupCodes(): number[] {
  const raw = process.env.SAP_B1_ITEM_GROUP_CODES?.trim()
  if (!raw) return []

  return raw
    .split(',')
    .map(part => Number(part.trim()))
    .filter(code => Number.isFinite(code))
}

export function isSapB1Enabled(): boolean {
  const flag = process.env.SAP_B1_ENABLED

  if (flag === undefined || flag === '') return false

  return !['false', '0', 'no', 'off'].includes(flag.toLowerCase())
}

export function isSapB1Configured(): boolean {
  return Boolean(getSapB1CompanyDb() && getSapB1User() && getSapB1Password())
}

export class SapB1DisabledError extends Error {
  constructor() {
    super('SAP B1 integration is disabled (SAP_B1_ENABLED=false)')
    this.name = 'SapB1DisabledError'
  }
}

export class SapB1ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SapB1ConfigError'
  }
}

export class SapB1UnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SapB1UnavailableError'
  }
}
