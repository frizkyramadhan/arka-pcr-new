/**
 * SAP B1 Service Layer session — singleton CookieJar, ensureSession, 401 auto-relogin.
 * Mirrors Laravel SapService + Guzzle CookieJar pattern.
 */
import {
  getSapB1CompanyDb,
  getSapB1Password,
  getSapB1User,
  isSapB1Configured,
  SapB1ConfigError,
  SapB1UnavailableError
} from '@/lib/sap-b1/config'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { sapB1CookieJar } from '@/lib/sap-b1/cookie-jar'
import { sapB1Fetch, type SapB1FetchOptions, type SapB1FetchResponse } from '@/lib/sap-b1/fetch'
import type { SapB1LoginResponse } from '@/types/sap-b1'

type SessionState = {
  expiresAt: number
}

let cachedSession: SessionState | null = null
let loginPromise: Promise<void> | null = null

const REFRESH_BUFFER_MS = 5 * 60 * 1000
const MAX_AUTH_RETRIES = 1

function sessionLifetimeMs(timeoutMinutes?: number): number {
  const minutes = timeoutMinutes && timeoutMinutes > 0 ? timeoutMinutes : 30

  return minutes * 60 * 1000
}

function isSessionExpired(): boolean {
  return !cachedSession || cachedSession.expiresAt <= Date.now()
}

/** True when B1SESSION cookie exists and local expiry has not passed. */
export function hasValidSession(): boolean {
  return sapB1CookieJar.hasSession() && !isSessionExpired()
}

/** Login only when no valid session — same as Laravel ensureSession(). */
export async function ensureSession(): Promise<void> {
  if (hasValidSession()) return

  if (!loginPromise) {
    loginPromise = login().finally(() => {
      loginPromise = null
    })
  }

  await loginPromise
}

async function login(): Promise<void> {
  if (!isSapB1Configured()) {
    throw new SapB1ConfigError('SAP B1 credentials are not configured (check SAP_B1_* env vars)')
  }

  sapB1CookieJar.clear()

  const res = await sapB1Fetch('/Login', {
    method: 'POST',
    body: {
      CompanyDB: getSapB1CompanyDb(),
      UserName: getSapB1User(),
      Password: getSapB1Password()
    }
  })

  sapB1CookieJar.ingestSetCookieHeaders(res.headers)

  if (!res.ok) {
    throw new SapB1ConfigError(
      toFriendlySapErrorMessage(`SAP B1 login failed (${res.status})`, 'Could not sign in to SAP.')
    )
  }

  if (!sapB1CookieJar.hasSession()) {
    throw new SapB1ConfigError(
      toFriendlySapErrorMessage(
        'SAP B1 login did not return B1SESSION cookie',
        'Could not sign in to SAP.'
      )
    )
  }

  let timeoutMinutes = 30

  try {
    const payload = (await res.json()) as SapB1LoginResponse
    if (payload.SessionTimeout) timeoutMinutes = payload.SessionTimeout
  } catch {
    // cookie jar is sufficient
  }

  cachedSession = {
    expiresAt: Date.now() + sessionLifetimeMs(timeoutMinutes) - REFRESH_BUFFER_MS
  }
}

function parseErrorDetail(res: SapB1FetchResponse, body: unknown): string {
  let detail = `${res.status} ${res.statusText}`

  if (body && typeof body === 'object' && 'error' in body) {
    const message = (body as { error?: { message?: { value?: string } | string } }).error?.message
    const text = typeof message === 'string' ? message : message?.value
    if (text) detail = text
  }

  return detail
}

async function authorizedFetchOnce(
  path: string,
  options: Omit<SapB1FetchOptions, 'cookie'> = {}
): Promise<SapB1FetchResponse> {
  await ensureSession()

  const res = await sapB1Fetch(path, {
    ...options,
    cookie: sapB1CookieJar.toCookieHeader()
  })

  sapB1CookieJar.ingestSetCookieHeaders(res.headers)

  return res
}

async function authorizedFetchWithRetry(
  path: string,
  options: Omit<SapB1FetchOptions, 'cookie'> = {},
  attempt = 0
): Promise<SapB1FetchResponse> {
  const res = await authorizedFetchOnce(path, options)

  if (res.status === 401 && attempt < MAX_AUTH_RETRIES) {
    invalidateSapB1Session()
    
return authorizedFetchWithRetry(path, options, attempt + 1)
  }

  return res
}

export async function sapB1AuthorizedFetch(
  path: string,
  options: Omit<SapB1FetchOptions, 'cookie'> = {}
): Promise<SapB1FetchResponse> {
  return authorizedFetchWithRetry(path, options)
}

export async function sapB1AuthorizedJson<T>(
  path: string,
  options: Omit<SapB1FetchOptions, 'cookie'> = {}
): Promise<T> {
  const res = await authorizedFetchWithRetry(path, options)

  if (res.status === 401) {
    throw new SapB1UnavailableError(toFriendlySapErrorMessage('SAP B1 session expired (401 Unauthorized)'))
  }

  if (!res.ok) {
    let body: unknown = null

    try {
      body = await res.json()
    } catch {
      // ignore
    }

    throw new SapB1UnavailableError(
      toFriendlySapErrorMessage(`SAP B1 error: ${parseErrorDetail(res, body)}`)
    )
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

/** @deprecated Use ensureSession() — kept for ping/health scripts. */
export async function getSapB1SessionCookie(): Promise<string> {
  await ensureSession()

  return sapB1CookieJar.toCookieHeader()
}

export function invalidateSapB1Session(): void {
  cachedSession = null
  sapB1CookieJar.clear()
}

export async function logoutSapB1Session(): Promise<void> {
  if (!sapB1CookieJar.hasSession()) {
    invalidateSapB1Session()

    return
  }

  try {
    await sapB1Fetch('/Logout', {
      method: 'POST',
      cookie: sapB1CookieJar.toCookieHeader()
    })
  } catch {
    // best-effort logout
  } finally {
    invalidateSapB1Session()
  }
}

export function getSapB1SessionDebugInfo(): { cookieCount: number; hasSession: boolean; expiresAt: number | null } {
  return {
    cookieCount: sapB1CookieJar.count,
    hasSession: hasValidSession(),
    expiresAt: cachedSession?.expiresAt ?? null
  }
}
