/**
 * Buka file picker lalu upload installation report (row action / toolbar).
 */
import toast from 'react-hot-toast'

import { formatUploadError } from 'src/utils/format-upload-error'
import { uploadReplacementReport } from 'src/utils/upload-replacement-report'

export function pickAndUploadReplacementReport(idRep, { onSuccess } = {}) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pdf,application/pdf'
  input.onchange = async event => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await uploadReplacementReport(idRep, file)
      toast.success('Installation report uploaded')
      onSuccess?.()
    } catch (error) {
      toast.error(error.userMessage ?? formatUploadError(error))
    }
  }
  input.click()
}
