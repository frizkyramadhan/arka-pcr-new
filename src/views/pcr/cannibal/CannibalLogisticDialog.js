/**
 * CannibalLogisticDialog — logistics statement; confirm moves BA to documentation.
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import { cannibalLogisticUpdateSchema } from '@/lib/validations/cannibal'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import { validateForm } from 'src/utils/api-error-message'
import {
  flagsFromLogisticStatement,
  logisticStatementFromFlags,
  LOGISTIC_STATEMENT_OPTIONS
} from 'src/utils/cannibal-form-lookups'

import CannibalStatementFields from 'src/views/pcr/cannibal/CannibalStatementFields'

const CONFIRM_MESSAGE =
  'Logistic statement will be saved and confirmed. The BA will then move to Record & Documentation (MR/PR and WO) before approval.\n\nDo you want to continue?'

const LEGACY_HINT =
  'This legacy record has no logistic statement yet. Select the confirmation and save to complete the record.'

const CannibalLogisticDialog = ({ open, onClose, onSave, initialData, legacyMode = false }) => {
  const [logisticStatement, setLogisticStatement] = useState('')
  const [logisticOtherText, setLogisticOtherText] = useState('')
  const [logisticLeadTimeDays, setLogisticLeadTimeDays] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState(null)

  useEffect(() => {
    if (!open) return

    setLogisticStatement(logisticStatementFromFlags(initialData))
    setLogisticOtherText(initialData?.logisticOtherText ?? '')
    setLogisticLeadTimeDays(
      initialData?.logisticLeadTimeDays != null && initialData.logisticLeadTimeDays > 0
        ? String(initialData.logisticLeadTimeDays)
        : ''
    )
    setConfirmOpen(false)
    setPendingPayload(null)
  }, [open, initialData])

  const handleStatementChange = value => {
    setLogisticStatement(value)
    if (value !== 'other') setLogisticOtherText('')
    if (value !== 'lead_time') setLogisticLeadTimeDays('')
  }

  const handleSubmit = () => {
    const form = flagsFromLogisticStatement(logisticStatement, logisticOtherText, logisticLeadTimeDays)
    const result = validateForm(cannibalLogisticUpdateSchema, form)
    if (!result.success) {
      toast.error(result.message)

      return
    }

    if (legacyMode) {
      setSaving(true)
      onSave(result.data).finally(() => setSaving(false))

      return
    }

    setPendingPayload(result.data)
    setConfirmOpen(true)
  }

  const handleConfirmSave = async () => {
    if (!pendingPayload) return

    setSaving(true)
    try {
      await onSave(pendingPayload)
      setConfirmOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
        <DialogTitle>Logistics Statement</DialogTitle>
        <DialogContent dividers>
          <Typography variant='body2' sx={{ color: 'text.secondary', mb: 4 }}>
            {legacyMode
              ? LEGACY_HINT
              : 'Complete the logistics statement. On confirm, the BA moves to Record & Documentation before approval.'}
          </Typography>
          <Box sx={{ p: 4, bgcolor: 'action.hover', borderRadius: 1 }}>
            <CannibalStatementFields
              title='LOGISTIC STATEMENT'
              options={LOGISTIC_STATEMENT_OPTIONS}
              value={logisticStatement}
              onChange={handleStatementChange}
              otherLabel='Other (Logistics)'
              otherValue={logisticOtherText}
              onOtherChange={setLogisticOtherText}
              leadTimeDays={logisticLeadTimeDays}
              onLeadTimeDaysChange={setLogisticLeadTimeDays}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant='contained' onClick={handleSubmit} disabled={saving}>
            {legacyMode ? 'Save Statement' : 'Confirm Logistics'}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmOpen}
        title='Confirm Logistic Statement'
        message={CONFIRM_MESSAGE}
        loading={saving}
        confirmLabel='Confirm'
        confirmColor='primary'
        onClose={() => {
          if (!saving) setConfirmOpen(false)
        }}
        onConfirm={handleConfirmSave}
      />
    </>
  )
}

export default CannibalLogisticDialog
