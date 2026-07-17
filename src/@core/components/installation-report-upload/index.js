/**
 * Installation report — picker, validasi inline, view/delete (legacy MAJOR component).
 */
import { useCallback, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import arkaApi from 'src/utils/arka-api'
import { formatUploadError } from 'src/utils/format-upload-error'
import {
  REPLACEMENT_REPORT_MAX_SIZE_MB,
  uploadReplacementReport,
  validateReplacementReportFileClient
} from 'src/utils/upload-replacement-report'

const InstallationReportUpload = ({
  idRep,
  file,
  onFileChange,
  hasExistingReport = false,
  onDeleted,
  onUploaded,
  uploadOnSelect = false,
  disabled = false
}) => {
  const [errorMessage, setErrorMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileInput = useCallback(
    async event => {
      const selected = event.target.files?.[0] ?? null
      event.target.value = ''

      if (!selected) {
        onFileChange?.(null)
        setErrorMessage('')

        return
      }

      const validation = validateReplacementReportFileClient(selected)
      if (!validation.ok) {
        setErrorMessage(validation.message)
        onFileChange?.(null)

        return
      }

      setErrorMessage('')
      onFileChange?.(selected)

      if (uploadOnSelect && idRep) {
        setUploading(true)
        try {
          await uploadReplacementReport(idRep, selected)
          toast.success('Installation report uploaded')
          onUploaded?.()
        } catch (error) {
          const message = error.userMessage ?? formatUploadError(error)
          setErrorMessage(message)
          onFileChange?.(null)
          if (!error?.toastShown) {
            toast.error(message)
          }
        } finally {
          setUploading(false)
        }
      }
    },
    [idRep, onFileChange, onUploaded, uploadOnSelect]
  )

  const handleDelete = async () => {
    if (!idRep) return

    setUploading(true)
    setErrorMessage('')

    try {
      await arkaApi.delete(`/replacements/${idRep}/report`)
      toast.success('Installation report removed')
      onDeleted?.()
    } catch (error) {
      const message = formatUploadError(error, { fallback: 'Failed to remove report' })
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box>
      {hasExistingReport && idRep ? (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            size='small'
            variant='tonal'
            component='a'
            href={`/api/replacements/${idRep}/report/`}
            target='_blank'
            rel='noopener noreferrer'
            disabled={disabled || uploading}
          >
            View current report
          </Button>
          <Button
            size='small'
            variant='tonal'
            color='error'
            onClick={handleDelete}
            disabled={disabled || uploading}
          >
            Delete report
          </Button>
        </Box>
      ) : null}

      <Button component='label' variant='outlined' disabled={disabled || uploading}>
        {uploading ? 'Uploading…' : 'Choose File'}
        <input
          hidden
          type='file'
          accept='.pdf,application/pdf'
          disabled={disabled || uploading}
          onChange={handleFileInput}
        />
      </Button>

      <Typography variant='body2' sx={{ mt: 1, color: 'text.secondary' }}>
        {file ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)` : 'No file chosen'}
      </Typography>

      <Typography variant='caption' sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        PDF only, max {REPLACEMENT_REPORT_MAX_SIZE_MB} MB
      </Typography>

      {errorMessage ? (
        <Alert severity='error' sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
    </Box>
  )
}

export default InstallationReportUpload
