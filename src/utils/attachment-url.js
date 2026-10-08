/**
 * Attachment download URLs — basePath-aware + trailingSlash for Docker/nginx.
 */
import { apiPath } from 'src/utils/base-path'

/** Relative browser URL for GET attachment file (basePath + trailing slash). */
export function attachmentDownloadUrl(attachmentId) {
  if (attachmentId == null || attachmentId === '') return ''

  const path = apiPath(`/attachments/${attachmentId}/download`)

  return path.endsWith('/') ? path : `${path}/`
}

/**
 * Link to open a file. Prefer `attachment.url` from the API (absolute, from AUTH_URL,
 * so production is http://host/arka-pcr/api/attachments/:id/download/).
 */
export function attachmentOpenUrl(attachment) {
  const fromApi = attachment && typeof attachment === 'object' ? attachment.url : ''
  if (typeof fromApi === 'string' && /^https?:\/\//i.test(fromApi.trim())) return fromApi.trim()

  const id = typeof attachment === 'string' ? attachment : attachment?.id

  return attachmentDownloadUrl(id)
}
