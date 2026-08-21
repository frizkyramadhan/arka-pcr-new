/**
 * Map technical SAP B1 / network errors to short English messages for UI & API clients.
 */

export const SAP_ERROR_HOST_UNREACHABLE =
  'Cannot reach the SAP server (hostname could not be resolved). Check network or SAP host settings.'

export const SAP_ERROR_CONNECTION_REFUSED =
  'Cannot connect to the SAP server (connection refused). The server may be offline.'

export const SAP_ERROR_CONNECTION_RESET =
  'Connection to the SAP server was interrupted. Please try again.'

export const SAP_ERROR_NETWORK_UNREACHABLE = 'SAP server is unreachable on the current network.'

export const SAP_ERROR_TIMEOUT = 'SAP request timed out. The server may be slow or unreachable.'

export const SAP_ERROR_TLS =
  'Secure connection to SAP failed (TLS/certificate issue). Contact IT.'

export const SAP_ERROR_DISABLED = 'SAP lookup is currently disabled.'

export const SAP_ERROR_NOT_CONFIGURED =
  'SAP integration is not configured. Contact the administrator.'

export const SAP_ERROR_LOGIN =
  'Could not sign in to SAP. Check credentials or company database settings.'

export const SAP_ERROR_SESSION = 'SAP session expired. Please try again.'

export const SAP_ERROR_FORBIDDEN = 'Access to this SAP document was denied.'

export const SAP_ERROR_DOCUMENT_NOT_FOUND = 'Document not found in SAP.'

const DEFAULT_UNAVAILABLE = 'SAP is temporarily unavailable. Please try again in a moment.'

const KNOWN_FRIENDLY_MESSAGES = new Set([
  SAP_ERROR_HOST_UNREACHABLE,

  // Previous wording — keep idempotent if still returned from a running server process
  'Cannot reach the SAP server (host not found). Check network or SAP host settings.',
  SAP_ERROR_CONNECTION_REFUSED,
  SAP_ERROR_CONNECTION_RESET,
  SAP_ERROR_NETWORK_UNREACHABLE,
  SAP_ERROR_TIMEOUT,
  SAP_ERROR_TLS,
  SAP_ERROR_DISABLED,
  SAP_ERROR_NOT_CONFIGURED,
  SAP_ERROR_LOGIN,
  SAP_ERROR_SESSION,
  SAP_ERROR_FORBIDDEN,
  SAP_ERROR_DOCUMENT_NOT_FOUND,
  DEFAULT_UNAVAILABLE
])

/** Extract a string message from Error, string, or unknown. */
export function getSapErrorRawMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || ''
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }

  return ''
}

/**
 * Convert raw Node/SAP error text into a user-friendly English message.
 * Keeps already-friendly messages as-is when they do not look technical.
 */
export function toFriendlySapErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_UNAVAILABLE
): string {
  const raw = getSapErrorRawMessage(error).trim()
  if (!raw) return fallback

  // Idempotent — do not re-map messages we already produced.
  if (KNOWN_FRIENDLY_MESSAGES.has(raw)) return raw

  const text = raw.toLowerCase()

  // DNS / host resolution — e.g. getaddrinfo ENOTFOUND arkasrv2
  if (text.includes('enotfound') || text.includes('getaddrinfo') || text.includes('err_name_not_resolved')) {
    return SAP_ERROR_HOST_UNREACHABLE
  }

  if (text.includes('econnrefused')) {
    return SAP_ERROR_CONNECTION_REFUSED
  }

  if (text.includes('econnreset') || text.includes('socket hang up')) {
    return SAP_ERROR_CONNECTION_RESET
  }

  if (text.includes('enetunreach') || text.includes('ehostunreach')) {
    return SAP_ERROR_NETWORK_UNREACHABLE
  }

  if (
    text.includes('etimedout') ||
    text.includes('esockettimedout') ||
    text.includes('timed out') ||
    text.includes('timeout')
  ) {
    return SAP_ERROR_TIMEOUT
  }

  if (
    text.includes('cert') ||
    text.includes('certificate') ||
    text.includes('unable to verify') ||
    text.includes('self signed') ||
    text.includes('ssl') ||
    text.includes('tls')
  ) {
    return SAP_ERROR_TLS
  }

  if (text.includes('disabled') || text.includes('sap_b1_enabled')) {
    return SAP_ERROR_DISABLED
  }

  if (
    text.includes('not configured') ||
    text.includes('credentials are not configured') ||
    text.includes('credentials missing')
  ) {
    return SAP_ERROR_NOT_CONFIGURED
  }

  if (text.includes('login failed') || text.includes('did not return b1session')) {
    return SAP_ERROR_LOGIN
  }

  if (text.includes('401') || text.includes('unauthorized') || text.includes('session expired')) {
    return SAP_ERROR_SESSION
  }

  if (text.includes('403') || text.includes('forbidden')) {
    return SAP_ERROR_FORBIDDEN
  }

  // Document missing only — avoid matching "host not found" / hostname phrases.
  if (
    text.includes('document not found') ||
    text.includes('not found in sap') ||
    /\b404\b/.test(text)
  ) {
    return SAP_ERROR_DOCUMENT_NOT_FOUND
  }

  if (
    text.includes('502') ||
    text.includes('503') ||
    text.includes('bad gateway') ||
    text.includes('service unavailable')
  ) {
    return DEFAULT_UNAVAILABLE
  }

  // Generic SAP B1 error: <detail> — keep short if detail is already readable
  const sapPrefix = /^sap b1 error:\s*/i
  if (sapPrefix.test(raw)) {
    const detail = raw.replace(sapPrefix, '').trim()
    if (!detail) return DEFAULT_UNAVAILABLE

    return toFriendlySapErrorMessage(detail, `SAP returned an error: ${detail}`)
  }

  // Raw Node syscall noise → default
  if (
    /^(error:)?\s*(connect|read|write)\s+e[a-z]+/i.test(raw) ||
    /\bE[A-Z]{3,}\b/.test(raw) ||
    text.includes('errno') ||
    text.includes('syscall')
  ) {
    return DEFAULT_UNAVAILABLE
  }

  // Already looks like a short product message
  if (raw.length <= 160 && !text.includes('at ') && !text.includes('\n')) {
    return raw
  }

  return fallback
}
