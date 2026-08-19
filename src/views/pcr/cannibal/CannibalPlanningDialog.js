/**
 * CannibalPlanningDialog — planning action + MR/PR after logistics (before approval).
 */
import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
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

import { cannibalPlanningUpdateSchema } from '@/lib/validations/cannibal'
import { sortPlanningActions } from '@/lib/cannibal/planning-lookups'
import arkaApi from 'src/utils/arka-api'
import { validateForm } from 'src/utils/api-error-message'
import { SapDocumentPicker } from 'src/views/pcr/sap'

const CannibalPlanningDialog = ({ open, onClose, onSave, initialData }) => {
  const [actions, setActions] = useState([])
  const [idAction, setIdAction] = useState('')
  const [mrNo, setMrNo] = useState('')
  const [prNo, setPrNo] = useState('')
  const [poNo, setPoNo] = useState('')
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
  }, [open, initialData])

  const handleSubmit = async () => {
    const payload = {
      idAction: Number(idAction),
      mrNo: mrNo.trim() || null,
      prNo: prNo.trim() || null,
      poNo: poNo.trim() || null
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
          Select the planning action and fill MR# / PR# before submitting this BA for approval. PO# is optional.
        </Typography>
        <RadioGroup value={idAction} onChange={e => setIdAction(e.target.value)} sx={{ mb: 4 }}>
          {sortPlanningActions(actions).map(item => (
            <FormControlLabel key={item.idAction} value={String(item.idAction)} control={<Radio size='small' />} label={item.action} />
          ))}
        </RadioGroup>
        <Grid container spacing={3}>
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
