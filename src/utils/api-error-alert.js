/**
 * Global API error toast (react-hot-toast) for arkaApi — 401, 403, 404, 5xx, network.
 */
import toast from 'react-hot-toast'

import { formatApiError } from 'src/utils/api-error-message'

/** Validation/conflict errors — handled locally in forms, not global toast. */
const SKIP_GLOBAL_TOAST_STATUSES = new Set([400, 409, 422])

let is401Redirecting = false

async function redirectToLogin() {
  if (is401Redirecting || typeof window === 'undefined') return

  is401Redirecting = true

  try {
    const { signOut } = await import('next-auth/react')
    await signOut({ redirect: false })
  } catch {
    // ignore — still send user to login
  }

  window.location.href = '/login'
}

/**
 * Show toast for API errors. Returns true if toast was shown.
 * @param {import('axios').AxiosError} error
 * @param {{ silent?: boolean }} [options]
 */
export function showApiErrorToast(error, options = {}) {
  if (options.silent || error?.toastShown) return false

  const status = error?.response?.status
  const isNetworkError = !error?.response && Boolean(error?.request)

  if (status && SKIP_GLOBAL_TOAST_STATUSES.has(status)) return false

  if (!status && !isNetworkError) return false

  const message = formatApiError(
    error,
    isNetworkError ? 'Network error — check your connection' : 'Request failed'
  )

  toast.error(message)
  error.toastShown = true

  if (status === 401) {
    redirectToLogin()
  }

  return true
}

/** @deprecated Use showApiErrorToast */
export const showApiErrorAlert = showApiErrorToast

/**
 * Catch-block helper: toast once (skip if interceptor already showed).
 */
export function notifyApiError(error, fallback = 'Request failed', toastFn = toast.error) {
  if (error?.toastShown) return

  const shown = showApiErrorToast(error)
  if (shown) return

  const message = error?.userMessage ?? formatApiError(error, fallback)
  if (typeof toastFn === 'function') {
    toastFn(message)
    error.toastShown = true
  }
}
