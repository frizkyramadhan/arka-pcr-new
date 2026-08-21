/**
 * CannibalExecutionDialog — combined Record & Documentation before approval:
 * planning action, MR/PR, WO numbers, and documentation notes.
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
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import { cannibalExecutionUpdateSchema } from '@/lib/validations/cannibal'
import { sortPlanningActions } from '@/lib/cannibal/planning-lookups'
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import arkaApi from 'src/utils/arka-api'
import { validateForm } from 'src/utils/api-error-message'
import { buildTransferPayload, getSharedComponentFields, getSingleTransfer } from 'src/utils/cannibal-transfer-form'
import { SapDocumentPicker } from 'src/views/pcr/sap'
import { fetchSapWoStatus, hasDocNumValue, normalizeDocNumValue } from 'src/views/pcr/sap/sap-document-utils'

import CannibalTransferDisplay from 'src/views/pcr/cannibal/CannibalTransferDisplay'

const CannibalExecutionDialog = ({ open, onClose, onSave, initialData }) => {
  const [actions, setActions] = useState([])
  const [idAction, setIdAction] = useState('')
  const [mrNo, setMrNo] = useState('')
  const [prNo, setPrNo] = useState('')
  const [poNo, setPoNo] = useState('')
  const [executionNotes, setExecutionNotes] = useState('')
  const [documentationComplete, setDocumentationComplete] = useState(false)
  const [transfer, setTransfer] = useState(getSingleTransfer(null))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    arkaApi
      .get('/ba-lookups')
      .then(res => setActions(res.data?.actions ?? []))
      .catch(() => setActions([]))
  }, [open])

  useEffect(() => {
    if (!open || !initialData) return

    setIdAction(initialData.idAction ? String(initialData.idAction) : '')
    setMrNo(initialData.mrNo ?? '')
    setPrNo(initialData.prNo ?? '')
    setPoNo(initialData.poNo ?? '')
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
    if (!idAction) {
      toast.error('Planning action is required')

      return
    }

    if (!mrNo.trim() || !prNo.trim()) {
      toast.error('MR# and PR# are required before submit for approval')

      return
    }

    const built = buildTransferPayload(transfer)

    const payload = {
      idAction: Number(idAction),
      mrNo: mrNo.trim() || null,
      prNo: prNo.trim() || null,
      poNo: poNo.trim() || null,
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
      <DialogTitle>Record & Documentation</DialogTitle>
      <DialogContent dividers>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 4 }}>
          Complete WO numbers, planning action, MR# / PR#, and documentation notes before submitting for approval.
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

        <Grid container spacing={3} sx={{ mb: 4 }}>
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
                WO INSTALL — {shared.compDesc || 'Component'}
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

        <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 600 }}>
          Planning action
        </Typography>
        <RadioGroup value={idAction} onChange={e => setIdAction(e.target.value)} sx={{ mb: 4 }}>
          {sortPlanningActions(actions).map(item => (
            <FormControlLabel key={item.idAction} value={String(item.idAction)} control={<Radio size='small' />} label={item.action} />
          ))}
        </RadioGroup>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <SapDocumentPicker type='mr' label='MR# *' value={mrNo} onChange={setMrNo} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <SapDocumentPicker type='pr' label='PR# *' value={prNo} onChange={setPrNo} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <SapDocumentPicker type='po' label='PO#' value={poNo} onChange={setPoNo} />
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          multiline
          minRows={4}
          label='Documentation notes'
          value={executionNotes}
          onChange={e => setExecutionNotes(e.target.value)}
        />

        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Checkbox checked={documentationComplete} onChange={e => setDocumentationComplete(e.target.checked)} />
          }
          label='Documentation complete — ready to submit for approval'
        />
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant='contained'
          startIcon={<Icon icon='tabler:device-floppy' />}
          onClick={handleSubmit}
          disabled={saving || !idAction}
        >
          Save Documentation
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CannibalExecutionDialog
