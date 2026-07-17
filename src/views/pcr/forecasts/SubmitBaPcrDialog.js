/**
 * Konfirmasi submit BA PCR — preview nomor dokumen + override nomor urut (per site, reset tahunan).
 */
import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import CustomTextField from 'src/@core/components/mui/text-field'

import arkaApi from 'src/utils/arka-api'
import { formatApiError } from 'src/utils/api-error-message'
import { formatBaPcrNumber, formatSequencePlaceholder } from 'src/utils/ba-pcr-number'

const SubmitBaPcrDialog = ({ open, forecast, onClose, onSuccess }) => {
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [sequenceInput, setSequenceInput] = useState('')

  useEffect(() => {
    if (!open || !forecast?.idForecast) {
      setPreview(null)
      setSequenceInput('')

      return
    }

    let cancelled = false
    setLoadingPreview(true)

    arkaApi
      .get(`/forecasts/${forecast.idForecast}/submit-ba/preview`)
      .then(res => {
        if (cancelled) return
        setPreview(res.data)
        setSequenceInput(res.data.sequenceLocked ? '' : formatSequencePlaceholder(res.data.suggestedSequence))
      })
      .catch(error => {
        if (cancelled) return
        toast.error(formatApiError(error, 'Gagal memuat preview nomor BA PCR'))
        onClose()
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, forecast?.idForecast, onClose])

  const resolvedSequence = useMemo(() => {
    if (!preview) return null
    if (preview.sequenceLocked) return preview.suggestedSequence

    const trimmed = sequenceInput.trim()
    if (!trimmed) return preview.suggestedSequence

    const parsed = Number.parseInt(trimmed, 10)

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [preview, sequenceInput])

  const previewNoBaPcr = useMemo(() => {
    if (!preview || resolvedSequence == null) return '—'

    if (preview.sequenceLocked) return preview.suggestedNoBaPcr

    return formatBaPcrNumber(resolvedSequence, preview.projectCode)
  }, [preview, resolvedSequence])

  const handleSubmit = async () => {
    if (!forecast?.idForecast || !preview) return

    if (!preview.sequenceLocked && sequenceInput.trim() && resolvedSequence == null) {
      toast.error('Nomor urut tidak valid')

      return
    }

    setSubmitting(true)
    try {
      const payload = {}
      if (!preview.sequenceLocked && resolvedSequence != null) {
        payload.sequence = resolvedSequence
      }

      await arkaApi.post(`/forecasts/${forecast.idForecast}/submit-ba`, payload)
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(formatApiError(error, 'Submit BA PCR gagal'))
    } finally {
      setSubmitting(false)
    }
  }

  const compLabel = forecast?.compDesc ?? forecast?.commod?.comp?.compDesc ?? 'component'
  const unitLabel = forecast?.unitNo ?? forecast?.unit_no ?? preview?.unitNo ?? ''

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Submit BA PCR?</DialogTitle>
      <DialogContent>
        {loadingPreview ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : preview ? (
          <>
            <Typography variant='body2' sx={{ mb: 3, color: 'text.secondary' }}>
              {unitLabel ? `Submit BA PCR untuk ${unitLabel} — ${compLabel}?` : `Submit BA PCR untuk ${compLabel}?`}{' '}
              Setiap submit membuat nomor BA PCR baru. Proses approval akan dimulai dari awal.
            </Typography>

            <Box
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 1,
                bgcolor: theme => `${theme.palette.primary.main}14`,
                border: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Nomor BA PCR
              </Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                {previewNoBaPcr}
              </Typography>
            </Box>

            {preview.sequenceLocked ? (
              <Alert severity='info' sx={{ mb: 2 }}>
                Nomor BA PCR sudah ditetapkan dan tidak dapat diubah saat submit ulang.
              </Alert>
            ) : (
              <>
                <CustomTextField
                  fullWidth
                  label='Nomor urut'
                  value={sequenceInput}
                  onChange={event => setSequenceInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  helperText={`Per site ${preview.projectCode}, reset setiap tahun ${preview.year}. Ubah jika perlu nomor lain.`}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                {preview.latestSequence > 0 ? (
                  <Typography variant='caption' sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                    Nomor urut terakhir site {preview.projectCode} tahun {preview.year}:{' '}
                    {formatSequencePlaceholder(preview.latestSequence)}
                  </Typography>
                ) : (
                  <Typography variant='caption' sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                    Belum ada BA PCR untuk site {preview.projectCode} pada tahun {preview.year}.
                  </Typography>
                )}
              </>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions className='dialog-actions-dense'>
        <Button onClick={onClose} disabled={submitting || loadingPreview}>
          Cancel
        </Button>
        <Button
          color='primary'
          variant='contained'
          onClick={handleSubmit}
          disabled={submitting || loadingPreview || !preview || resolvedSequence == null}
        >
          {submitting ? 'Refreshing & submitting…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SubmitBaPcrDialog
