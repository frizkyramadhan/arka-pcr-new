/**
 * CannibalExecutionDialog — WO aktual & dokumentasi setelah approval (satu komponen).
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import { cannibalExecutionUpdateSchema } from '@/lib/validations/cannibal'
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import { validateForm } from 'src/utils/api-error-message'
import { buildTransferPayload, getSharedComponentFields, getSingleTransfer } from 'src/utils/cannibal-transfer-form'
import { fetchSapWoStatus, hasDocNumValue, normalizeDocNumValue } from 'src/views/pcr/sap/sap-document-utils'

import CannibalTransferDisplay from 'src/views/pcr/cannibal/CannibalTransferDisplay'

const CannibalExecutionDialog = ({ open, onClose, onSave, initialData }) => {
  const [executionNotes, setExecutionNotes] = useState('')
  const [documentationComplete, setDocumentationComplete] = useState(false)
  const [transfer, setTransfer] = useState(getSingleTransfer(null))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !initialData) return

    setExecutionNotes(initialData.executionNotes ?? '')
    setDocumentationComplete(Boolean(initialData.documentationComplete))
    setTransfer(getSingleTransfer(initialData))
  }, [open, initialData])

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    let active = true

    const syncWoStatuses = async () => {
      const sides = [
        { key: 'remove', woNo: transfer.remove.woNoKanibal },
        { key: 'install', woNo: transfer.install.woNoKanibal }
      ]

      const updates = await Promise.all(
        sides.map(async ({ key, woNo }) => {
          const normalized = normalizeDocNumValue(woNo)
          if (!hasDocNumValue(normalized) || normalized.length < 8) {
            return [key, '']
          }

          const status = await fetchSapWoStatus(normalized, controller.signal)

          return [key, status || '']
        })
      )

      if (!active) return

      setTransfer(prev => {
        const next = { ...prev }

        for (const [key, status] of updates) {
          if (next[key].woStatusKanibal === status) continue
          next[key] = { ...next[key], woStatusKanibal: status }
        }

        return next
      })
    }

    syncWoStatuses()

    return () => {
      active = false
      controller.abort()
    }
  }, [open, transfer.install.woNoKanibal, transfer.remove.woNoKanibal])

  const handleSideChange = (sideKey, field, value) => {
    setTransfer(prev => ({
      ...prev,
      [sideKey]: { ...prev[sideKey], [field]: value }
    }))
  }

  const handleSubmit = async () => {
    const built = buildTransferPayload(transfer)
    const payload = {
      executionNotes: executionNotes.trim() || null,
      documentationComplete,
      pairs: [built]
    }

    const result = validateForm(cannibalExecutionUpdateSchema, payload)
    if (!result.success) {
      toast.error(result.message)

      return
    }

    setSaving(true)
    try {
      await onSave(result.data)
    } finally {
      setSaving(false)
    }
  }

  const shared = getSharedComponentFields(transfer)

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='paper'>
      <DialogTitle>Record & Dokumentasi</DialogTitle>
      <DialogContent dividers>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 4 }}>
          Isi nomor WO aktual untuk pelaksanaan REMOVE dan INSTALL, lalu lengkapi catatan dokumentasi.
        </Typography>

        <Box sx={{ mb: 4 }}>
          <CannibalTransferDisplay
            transfer={transfer}
            compact
            sapWoStatuses={{
              remove: transfer.remove.woStatusKanibal || null,
              install: transfer.install.woStatusKanibal || null
            }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, borderRadius: 1, border: theme => `1px solid ${theme.palette.warning.main}` }}>
              <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 600 }}>
                WO REMOVE
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='WO#'
                    value={transfer.remove.woNoKanibal}
                    onChange={e => handleSideChange('remove', 'woNoKanibal', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <CustomTextField
                    fullWidth
                    readOnly
                    size='small'
                    label='Status'
                    value={transfer.remove.woStatusKanibal}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, borderRadius: 1, border: theme => `1px solid ${theme.palette.success.main}` }}>
              <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 600 }}>
                WO INSTALL — {shared.compDesc || 'Komponen'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='WO#'
                    value={transfer.install.woNoKanibal}
                    onChange={e => handleSideChange('install', 'woNoKanibal', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <CustomTextField
                    fullWidth
                    readOnly
                    size='small'
                    label='Status'
                    value={transfer.install.woStatusKanibal}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          multiline
          minRows={4}
          label='Catatan Dokumentasi'
          value={executionNotes}
          onChange={e => setExecutionNotes(e.target.value)}
          sx={{ mt: 4 }}
        />

        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Checkbox checked={documentationComplete} onChange={e => setDocumentationComplete(e.target.checked)} />
          }
          label='Dokumentasi lengkap — siap close BA'
        />
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Batal
        </Button>
        <Button
          variant='contained'
          startIcon={<Icon icon='tabler:device-floppy' />}
          onClick={handleSubmit}
          disabled={saving}
        >
          Simpan
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CannibalExecutionDialog
