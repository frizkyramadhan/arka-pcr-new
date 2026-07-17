/**
 * Pesan error upload yang ramah pengguna (network, validasi, API).
 */
import { formatApiError } from 'src/utils/api-error-message'

export const REPLACEMENT_REPORT_MAX_SIZE_MB =
  Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB) || 50

const SERVER_MESSAGE_MAP = {
  'File too large': `File exceeds the ${REPLACEMENT_REPORT_MAX_SIZE_MB} MB limit.`,
  'Report must be a PDF file': 'Installation report must be a PDF file.',
  'File is required': 'Please choose a file to upload.',
  'File is empty.': 'The selected file is empty.'
}

/**
 * @param {unknown} error — Axios error or Error
 * @param {{ fallback?: string, maxSizeMb?: number }} [options]
 */
export function formatUploadError(error, options = {}) {
  const maxSizeMb = options.maxSizeMb ?? REPLACEMENT_REPORT_MAX_SIZE_MB
  const fallback = options.fallback ?? 'Upload failed. Please try again.'

  if (!error) return fallback

  const isNetworkError =
    Boolean(error?.request) && !error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error')

  if (isNetworkError) {
    return `Upload failed — the server could not receive the file. Check your connection and try again. If the problem continues, sign out and back in, or contact support.`
  }

  const apiMessage = formatApiError(error, fallback)

  if (SERVER_MESSAGE_MAP[apiMessage]) {
    return SERVER_MESSAGE_MAP[apiMessage]
  }

  if (apiMessage.includes('File exceeds')) {
    return apiMessage
  }

  return apiMessage
}
