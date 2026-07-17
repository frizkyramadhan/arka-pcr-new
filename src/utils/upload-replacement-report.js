/**
 * Upload installation report — jangan set Content-Type manual (boundary multipart).
 */
import arkaApi from 'src/utils/arka-api'
import { formatUploadError, REPLACEMENT_REPORT_MAX_SIZE_MB } from 'src/utils/format-upload-error'

export { REPLACEMENT_REPORT_MAX_SIZE_MB }

/** Validasi client-side sebelum upload. */
export function validateReplacementReportFileClient(file) {
  if (!file) {
    return { ok: false, message: 'Please choose a file to upload.' }
  }

  const name = file.name.toLowerCase()
  if (!name.endsWith('.pdf')) {
    return { ok: false, message: 'Installation report must be a PDF file.' }
  }

  const maxBytes = REPLACEMENT_REPORT_MAX_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File exceeds the ${REPLACEMENT_REPORT_MAX_SIZE_MB} MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`
    }
  }

  if (file.size === 0) {
    return { ok: false, message: 'The selected file is empty.' }
  }

  return { ok: true }
}

/**
 * @param {number} idRep
 * @param {File} file
 * @returns {Promise<object>} updated replacement row
 */
export async function uploadReplacementReport(idRep, file) {
  const validation = validateReplacementReportFileClient(file)
  if (!validation.ok) {
    const err = new Error(validation.message)
    err.userMessage = validation.message
    throw err
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const { data } = await arkaApi.post(`/replacements/${idRep}/report`, formData, {
      skipGlobalErrorToast: true
    })

    return data
  } catch (error) {
    error.userMessage = formatUploadError(error)
    throw error
  }
}
