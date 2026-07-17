/**
 * In-memory cookie jar for SAP B1 Service Layer (equivalent to Guzzle CookieJar).
 * Stores B1SESSION + ROUTEID from Set-Cookie and attaches them to every request.
 */
import type { IncomingHttpHeaders } from 'node:http'

export class SapB1CookieJar {
  private cookies = new Map<string, string>()

  /** Parse Set-Cookie response headers and merge into the jar. */
  ingestSetCookieHeaders(headers: IncomingHttpHeaders): void {
    const setCookie = headers['set-cookie']
    if (!setCookie) return

    const entries = Array.isArray(setCookie) ? setCookie : [setCookie]

    for (const entry of entries) {
      const pair = entry.split(';')[0]?.trim()
      if (!pair) continue

      const separator = pair.indexOf('=')
      if (separator <= 0) continue

      const name = pair.slice(0, separator).trim()
      const value = pair.slice(separator + 1).trim()
      if (name) this.cookies.set(name, value)
    }
  }

  get count(): number {
    return this.cookies.size
  }

  hasSession(): boolean {
    return this.cookies.has('B1SESSION') && Boolean(this.cookies.get('B1SESSION'))
  }

  toCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }

  clear(): void {
    this.cookies.clear()
  }
}

/** Process-wide singleton — reuse one SAP session across concurrent API requests. */
export const sapB1CookieJar = new SapB1CookieJar()
