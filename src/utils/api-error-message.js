/**
 * Extract a user-friendly message from axios/API errors.
 */
export function formatApiError(error, fallback = 'Request failed') {
  const data = error?.response?.data

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error
  }

  if (data?.error && typeof data.error === 'object') {
    const fieldErrors = data.error.fieldErrors
    if (fieldErrors && typeof fieldErrors === 'object') {
      for (const messages of Object.values(fieldErrors)) {
        if (Array.isArray(messages) && messages[0]) {
          return messages[0]
        }
      }
    }

    const formErrors = data.error.formErrors
    if (Array.isArray(formErrors) && formErrors[0]) {
      return formErrors[0]
    }
  }

  if (error?.message && !error.message.includes('Network Error')) {
    return error.message
  }

  if (error?.response?.status === 401) return 'Session expired — please sign in again'
  if (error?.response?.status === 403) return 'You do not have permission for this action'
  if (error?.response?.status === 404) return 'Resource not found'
  if (error?.response?.status >= 500) return 'Server error — try again or contact administrator'

  return fallback
}

/**
 * Validate form payload with a Zod schema before submit.
 */
export function validateForm(schema, data) {
  const result = validateFormFields(schema, data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    message: result.message,
    field: result.field,
    fieldErrors: result.fieldErrors
  }
}

/** Validate all fields — returns a map of `path.to.field` → message for inline UI errors. */
export function validateFormFields(schema, data) {
  const parsed = schema.safeParse(data)

  if (parsed.success) {
    return { success: true, data: parsed.data, fieldErrors: {} }
  }

  const fieldErrors = {}

  for (const issue of parsed.error.issues) {
    const key = issue.path.map(String).join('.')
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message
    }
  }

  const first = parsed.error.issues[0]
  const field = first?.path?.length ? first.path.join('.') : null
  const message = first?.message ?? 'Validation failed'

  return {
    success: false,
    fieldErrors,
    message: field ? `${field}: ${message}` : message,
    field
  }
}

export function getFieldError(fieldErrors, ...paths) {
  if (!fieldErrors) return ''

  for (const path of paths) {
    const key = Array.isArray(path) ? path.join('.') : path
    if (fieldErrors[key]) return fieldErrors[key]
  }

  return ''
}
