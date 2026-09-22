/**
 * Attachment download URLs — basePath-aware + trailingSlash for Docker/nginx.
 */
import { apiPath } from 'src/utils/base-path'

/** Browser URL for GET attachment file (img src, window.open, <a href>). */
export function attachmentDownloadUrl(attachmentId) {
  if (attachmentId == null || attachmentId === '') return ''

  const path = apiPath(`/attachments/${attachmentId}/download`)

  return path.endsWith('/') ? path : `${path}/`
}
