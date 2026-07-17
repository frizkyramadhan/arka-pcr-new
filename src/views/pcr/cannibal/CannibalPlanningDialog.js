/**
 * CannibalPlanningDialog — planning action selection after plant submit.
 */
import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import { cannibalPlanningUpdateSchema } from '@/lib/validations/cannibal'
import { sortPlanningActions } from '@/lib/cannibal/planning-lookups'
import arkaApi from 'src/utils/arka-api'
import { validateForm } from 'src/utils/api-error-message'

const CannibalPlanningDialog = ({ open, onClose, onSave, initialData }) => {
  const [actions, setActions] = useState([])
  const [idAction, setIdAction] = useState('')
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
  }, [open, initialData])

  const handleSubmit = async () => {
    const payload = {
      idAction: Number(idAction)
    }

    const result = validateForm(cannibalPlanningUpdateSchema, payload)
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Action by Planning Section</DialogTitle>
      <DialogContent dividers>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 4 }}>
          Planning follow-up after the BA has been submitted by plant.
        </Typography>
        <RadioGroup value={idAction} onChange={e => setIdAction(e.target.value)}>
          {sortPlanningActions(actions).map(item => (
            <FormControlLabel key={item.idAction} value={String(item.idAction)} control={<Radio size='small' />} label={item.action} />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving || !idAction}>
          Save Planning
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CannibalPlanningDialog
