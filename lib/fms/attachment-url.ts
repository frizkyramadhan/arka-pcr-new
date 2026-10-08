/**
 * Public URL for an attachment file.
 * Production serves the app under AUTH_URL (http://host/arka-pcr). Files are not in `public/`,
 * so `/uploads/attachments/...` is not a working link. The file is streamed by the download API.
 */
import { getAppBaseUrl } from '@/lib/notifications/mailer'

/** App path, with the trailing slash Next.js requires (`trailingSlash: true`). */
export function attachmentDownloadPath(attachmentId: string): string {
  return `/api/attachments/${encodeURIComponent(attachmentId)}/download/`
}

/** Absolute URL for the current environment: localhost in dev, AUTH_URL in production. */
export function attachmentPublicUrl(attachmentId: string): string {
  return `${getAppBaseUrl()}${attachmentDownloadPath(attachmentId)}`
}
