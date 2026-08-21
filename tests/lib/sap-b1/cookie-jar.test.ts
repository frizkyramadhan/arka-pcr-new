import { describe, expect, it } from 'vitest'

import { SapB1CookieJar } from '@/lib/sap-b1/cookie-jar'
import { hasValidSession, invalidateSapB1Session } from '@/lib/sap-b1/session'

describe('SapB1CookieJar', () => {
  it('stores B1SESSION and ROUTEID from Set-Cookie headers', () => {
    const jar = new SapB1CookieJar()

    jar.ingestSetCookieHeaders({
      'set-cookie': [
        'B1SESSION=abc123; Path=/; HttpOnly',
        'ROUTEID=.node1; Path=/'
      ]
    })

    expect(jar.count).toBe(2)
    expect(jar.hasSession()).toBe(true)
    expect(jar.toCookieHeader()).toBe('B1SESSION=abc123; ROUTEID=.node1')
  })

  it('merges updated cookies on subsequent responses', () => {
    const jar = new SapB1CookieJar()

    jar.ingestSetCookieHeaders({
      'set-cookie': ['B1SESSION=old; Path=/']
    })
    jar.ingestSetCookieHeaders({
      'set-cookie': ['B1SESSION=new; Path=/']
    })

    expect(jar.toCookieHeader()).toBe('B1SESSION=new')
  })

  it('clear removes all cookies', () => {
    const jar = new SapB1CookieJar()
    jar.ingestSetCookieHeaders({ 'set-cookie': ['B1SESSION=x; Path=/'] })
    jar.clear()
    expect(jar.hasSession()).toBe(false)
  })
})

describe('hasValidSession', () => {
  it('returns false when session is invalidated', () => {
    invalidateSapB1Session()
    expect(hasValidSession()).toBe(false)
  })
})
