/**
 * Low-level HTTP client for SAP B1 Service Layer.
 * Credentials and session cookies never leave the server process.
 */
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

import {
  getSapB1BaseUrl,
  getSapB1TimeoutMs,
  shouldRejectUnauthorizedTls,
  SapB1UnavailableError
} from '@/lib/sap-b1/config'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'

let httpsAgent: https.Agent | null = null

function getHttpsAgent(): https.Agent | undefined {
  if (shouldRejectUnauthorizedTls()) return undefined

  if (!httpsAgent) {
    httpsAgent = new https.Agent({ rejectUnauthorized: false })
  }

  return httpsAgent
}

function joinUrl(path: string): string {
  const base = getSapB1BaseUrl()
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function cookieHeaderFromHeaders(headers: http.IncomingHttpHeaders): string {
  const setCookie = headers['set-cookie']
  if (!setCookie) return ''

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]

  return cookies.map(entry => entry.split(';')[0]?.trim()).filter(Boolean).join('; ')
}

type HttpResult = {
  status: number
  headers: http.IncomingHttpHeaders
  body: string
}

function httpRequest(url: string, init: { method?: string; headers?: Record<string, string>; body?: string }): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : http
    const timeoutMs = getSapB1TimeoutMs()

    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: init.method ?? 'GET',
        headers: init.headers,
        agent: isHttps ? getHttpsAgent() : undefined,
        timeout: timeoutMs
      },
      res => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => {
          body += chunk
        })
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body
          })
        })
      }
    )

    req.on('timeout', () => {
      req.destroy(new Error(`SAP B1 request timed out after ${timeoutMs}ms`))
    })
    req.on('error', reject)

    if (init.body) req.write(init.body)
    req.end()
  })
}

export type SapB1FetchOptions = {
  method?: string
  body?: unknown
  cookie?: string
}

export type SapB1FetchResponse = {
  ok: boolean
  status: number
  statusText: string
  headers: http.IncomingHttpHeaders
  json(): Promise<unknown>
  clone(): SapB1FetchResponse
  _body: string
}

function toResponse(result: HttpResult): SapB1FetchResponse {
  const response: SapB1FetchResponse = {
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    statusText: String(result.status),
    headers: result.headers,
    _body: result.body,
    json: async () => (result.body ? JSON.parse(result.body) : null),
    clone: () => toResponse({ ...result, body: result.body })
  }

  return response
}

export async function sapB1Fetch(path: string, options: SapB1FetchOptions = {}): Promise<SapB1FetchResponse> {
  const url = joinUrl(path)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  if (options.cookie) {
    headers.Cookie = options.cookie
  }

  try {
    const result = await httpRequest(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    })

    return toResponse(result)
  } catch (error) {
    throw new SapB1UnavailableError(toFriendlySapErrorMessage(error, 'SAP request failed'))
  }
}

export async function sapB1FetchJson<T>(path: string, options: SapB1FetchOptions = {}): Promise<T> {
  const res = await sapB1Fetch(path, options)

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`

    try {
      const payload = (await res.json()) as { error?: { message?: { value?: string } | string } }
      const message = payload?.error?.message
      const text = typeof message === 'string' ? message : message?.value
      if (text) detail = text
    } catch {
      // ignore parse errors
    }

    throw new SapB1UnavailableError(toFriendlySapErrorMessage(`SAP B1 error: ${detail}`))
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

export function cookieHeaderFromResponse(res: SapB1FetchResponse): string {
  return cookieHeaderFromHeaders(res.headers)
}
