/**
 * Friendly SAP error message mapping.
 */
import { describe, expect, it } from 'vitest'

import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'

describe('toFriendlySapErrorMessage', () => {
  it('maps ENOTFOUND / getaddrinfo to a clear host message', () => {
    expect(toFriendlySapErrorMessage('getaddrinfo ENOTFOUND arkasrv2')).toBe(
      'Cannot reach the SAP server (hostname could not be resolved). Check network or SAP host settings.'
    )
  })

  it('does not remmap host-unreachable into document-not-found', () => {
    const friendly = toFriendlySapErrorMessage('getaddrinfo ENOTFOUND arkasrv2')
    expect(toFriendlySapErrorMessage(friendly)).toBe(friendly)
    expect(friendly).not.toContain('Document not found')
  })

  it('maps connection refused', () => {
    expect(toFriendlySapErrorMessage('connect ECONNREFUSED 10.0.0.1:50000')).toBe(
      'Cannot connect to the SAP server (connection refused). The server may be offline.'
    )
  })

  it('maps timeout messages', () => {
    expect(toFriendlySapErrorMessage('SAP B1 request timed out after 15000ms')).toBe(
      'SAP request timed out. The server may be slow or unreachable.'
    )
  })

  it('maps session expired', () => {
    expect(toFriendlySapErrorMessage('SAP B1 session expired (401 Unauthorized)')).toBe(
      'SAP session expired. Please try again.'
    )
  })

  it('keeps short product messages', () => {
    expect(toFriendlySapErrorMessage('Document not found in SAP.')).toBe('Document not found in SAP.')
  })

  it('uses fallback for empty input', () => {
    expect(toFriendlySapErrorMessage('', 'Custom fallback')).toBe('Custom fallback')
  })
})
