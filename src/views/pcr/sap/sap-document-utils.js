/**
 * Shared labels and helpers for SAP document UI components.
 */
import { apiPath } from 'src/utils/base-path'

export const SAP_DOCUMENT_LABELS = {
  wo: 'Work Order',
  mr: 'Material Request',
  pr: 'Purchase Request',
  po: 'Purchase Order',
  mi: 'Material Issue'
}

export const SAP_DOCUMENT_SHORT_LABELS = {
  wo: 'WO',
  mr: 'MR',
  pr: 'PR',
  po: 'PO',
  mi: 'MI'
}

/** Display label with document prefix, e.g. WO# 265151564. */
export function formatDocNumLabel(type, docNum) {
  const normalized = normalizeDocNumValue(docNum)
  if (!normalized) return '—'

  const prefix = SAP_DOCUMENT_SHORT_LABELS[type] ?? String(type ?? '').toUpperCase()

  return `${prefix}# ${normalized}`
}

export function normalizeDocNumValue(value) {
  if (value == null || value === '') return ''

  return String(value).trim().replace(/\D/g, '')
}

export function hasDocNumValue(value) {
  return normalizeDocNumValue(value).length > 0
}

export function statusChipColor(statusLabel) {
  const text = String(statusLabel ?? '').toLowerCase()

  if (text.includes('expir')) return 'error'
  if (text.includes('open') || text.includes('pending')) return 'warning'
  if (text.includes('close') || text.includes('approved')) return 'success'
  if (text.includes('cancel') || text.includes('not approved')) return 'error'

  return 'secondary'
}

function isExpiredStatusText(value) {
  const text = String(value ?? '').trim()
  if (!text) return false

  const upper = text.toUpperCase()
  if (upper === 'E') return true
  if (/not\s*expir/i.test(text) || /non[\s-]*expir/i.test(text)) return false

  return /\bexpir/i.test(text)
}

function toCalendarDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)

    return match ? match[1] : null
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function isCalendarDateBeforeToday(value) {
  const dateKey = toCalendarDateKey(value)
  const todayKey = toCalendarDateKey(new Date())

  if (!dateKey || !todayKey) return false

  return dateKey < todayKey
}

/** Expired badge label for PR/PO cards — uses mapper fields + status fallbacks. */
export function getExpiredDisplayLabel(type, item) {
  if (!item || (type !== 'pr' && type !== 'po')) return null
  if (item.expiredLabel) return item.expiredLabel

  const expStatus = String(item.expStatus ?? '').trim()
  if (expStatus && isExpiredStatusText(expStatus)) {
    return expStatus || 'Expired'
  }

  // PO: Valid To only applies while document is still Open.
  if (type === 'po' && item.validTo && item.docStatus !== 'C') {
    if (isCalendarDateBeforeToday(item.validTo)) {
      return `Expired (${toCalendarDateKey(item.validTo)})`
    }
  }

  if (type === 'pr') {
    const statusLabel = String(item.docStatusLabel ?? '').trim()
    if (statusLabel && isExpiredStatusText(statusLabel)) {
      return statusLabel || 'Expired'
    }
  }

  return null
}

/** Format SAP monetary amount with optional currency code. */
export function formatSapMoney(amount, currency) {
  if (amount == null || amount === '' || !Number.isFinite(Number(amount))) return '—'

  const formatted = Number(amount).toLocaleString('id-ID')
  const curr = String(currency ?? '').trim()

  return curr ? `${curr} ${formatted}` : formatted
}

/**
 * Map technical SAP/network errors to short English UI messages.
 * Mirrors lib/sap-b1/error-messages.ts for client-side safety.
 */
const SAP_FRIENDLY_DEFAULT = 'SAP is temporarily unavailable. Please try again in a moment.'

const SAP_FRIENDLY_KNOWN = new Set([
  'Cannot reach the SAP server (hostname could not be resolved). Check network or SAP host settings.',
  'Cannot reach the SAP server (host not found). Check network or SAP host settings.',
  'Cannot connect to the SAP server (connection refused). The server may be offline.',
  'Connection to the SAP server was interrupted. Please try again.',
  'SAP server is unreachable on the current network.',
  'SAP request timed out. The server may be slow or unreachable.',
  'Secure connection to SAP failed (TLS/certificate issue). Contact IT.',
  'SAP lookup is currently disabled.',
  'SAP integration is not configured. Contact the administrator.',
  'Could not sign in to SAP. Check credentials or company database settings.',
  'SAP session expired. Please try again.',
  'Access to this SAP document was denied.',
  'Document not found in SAP.',
  SAP_FRIENDLY_DEFAULT
])

export function toFriendlySapErrorMessage(error, fallback = SAP_FRIENDLY_DEFAULT) {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error?.message != null
          ? String(error.message)
          : ''

  const text = String(raw ?? '').trim()
  if (!text) return fallback

  // Already friendly — do not rematch substrings like "not found".
  if (SAP_FRIENDLY_KNOWN.has(text)) return text

  const lower = text.toLowerCase()

  if (lower.includes('enotfound') || lower.includes('getaddrinfo') || lower.includes('err_name_not_resolved')) {
    return 'Cannot reach the SAP server (hostname could not be resolved). Check network or SAP host settings.'
  }

  if (lower.includes('econnrefused')) {
    return 'Cannot connect to the SAP server (connection refused). The server may be offline.'
  }

  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return 'Connection to the SAP server was interrupted. Please try again.'
  }

  if (lower.includes('enetunreach') || lower.includes('ehostunreach')) {
    return 'SAP server is unreachable on the current network.'
  }

  if (
    lower.includes('etimedout') ||
    lower.includes('esockettimedout') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return 'SAP request timed out. The server may be slow or unreachable.'
  }

  if (
    lower.includes('cert') ||
    lower.includes('certificate') ||
    lower.includes('unable to verify') ||
    lower.includes('self signed') ||
    lower.includes('ssl') ||
    lower.includes('tls')
  ) {
    return 'Secure connection to SAP failed (TLS/certificate issue). Contact IT.'
  }

  if (lower.includes('disabled') || lower.includes('sap_b1_enabled')) {
    return 'SAP lookup is currently disabled.'
  }

  if (lower.includes('not configured') || lower.includes('credentials')) {
    return 'SAP integration is not configured. Contact the administrator.'
  }

  if (lower.includes('login failed') || lower.includes('b1session')) {
    return 'Could not sign in to SAP. Check credentials or company database settings.'
  }

  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('session expired')) {
    return 'SAP session expired. Please try again.'
  }

  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'Access to this SAP document was denied.'
  }

  // Document missing only — do not match "host not found".
  if (lower.includes('document not found') || lower.includes('not found in sap') || /\b404\b/.test(lower)) {
    return 'Document not found in SAP.'
  }

  if (/\bE[A-Z]{3,}\b/.test(text) || lower.includes('errno') || lower.includes('syscall')) {
    return fallback
  }

  if (text.length <= 160 && !lower.includes('\n')) {
    return text
  }

  return fallback
}

function throwFriendlySapError(payloadError, fallback) {
  throw new Error(toFriendlySapErrorMessage(payloadError ?? fallback, fallback))
}

export async function fetchSapDocument(type, docNum, signal) {
  const res = await fetch(apiPath(`/sap/documents?type=${encodeURIComponent(type)}&docNum=${encodeURIComponent(docNum)}`), {
    signal
  })
  const payload = await res.json()

  if (!res.ok) {
    throwFriendlySapError(payload.error, 'Failed to load SAP document.')
  }

  return payload.data
}

/** Fetch decoded WO status label from SAP Service Layer (full DocNum only). */
export async function fetchSapWoStatus(docNum, signal) {
  const normalized = normalizeDocNumValue(docNum)
  if (!hasDocNumValue(normalized) || normalized.length < 8) return null

  try {
    const data = await fetchSapDocument('wo', normalized, signal)

    return data?.statusLabel?.trim() || null
  } catch {
    return null
  }
}

export function getReferenceLabels(scope = 'ba') {
  if (scope === 'replacement') {
    return { chip: 'PCR Reference', prefix: 'PCR' }
  }

  return { chip: 'BA Reference', prefix: 'BA' }
}

export async function fetchSapDocumentChain({ woNo, woRemoveNo, woInstallNo, mrNo, prNo, poNo, signal }) {
  const params = new URLSearchParams()

  if (woNo) params.set('woNo', normalizeDocNumValue(woNo))
  if (woRemoveNo) params.set('woRemoveNo', normalizeDocNumValue(woRemoveNo))
  if (woInstallNo) params.set('woInstallNo', normalizeDocNumValue(woInstallNo))
  if (mrNo) params.set('mrNo', normalizeDocNumValue(mrNo))
  if (prNo) params.set('prNo', normalizeDocNumValue(prNo))
  if (poNo) params.set('poNo', normalizeDocNumValue(poNo))

  const res = await fetch(apiPath(`/sap/documents/chain?${params.toString()}`), { signal })
  const payload = await res.json()

  if (!res.ok) {
    throwFriendlySapError(payload.error, 'Failed to load SAP document chain.')
  }

  return payload.data
}

export async function searchSapDocuments({ type, query, relatedWo, relatedMr, limit = 10, signal }) {
  const params = new URLSearchParams({ type, limit: String(limit) })

  if (relatedWo) params.set('relatedWo', relatedWo)
  else if (relatedMr) params.set('relatedMr', relatedMr)
  else params.set('q', query)

  const res = await fetch(apiPath(`/sap/documents/search?${params.toString()}`), { signal })
  const payload = await res.json()

  if (!res.ok) {
    throwFriendlySapError(payload.error, 'Failed to search SAP documents.')
  }

  return Array.isArray(payload.data) ? payload.data : []
}
