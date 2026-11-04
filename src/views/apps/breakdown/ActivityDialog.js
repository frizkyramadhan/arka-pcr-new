/** Dialog to add or edit one activity on an open breakdown. */
import { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import toast from 'react-hot-toast'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import { useAuth } from 'src/hooks/useAuth'
import arkaApi from 'src/utils/arka-api'
import { splitWallClock } from 'src/utils/date-format'

const POSITIONS = [
  { value: 'BD', label: 'BD — breakdown' },
  { value: 'OP', label: 'OP — operation' },
  { value: 'SB', label: 'SB — standby' },
  { value: 'AJ', label: 'AJ — additional job' }
]

const empty = () => ({
  code: '',
  position: 'BD',
  startedDate: '',
  startedTime: '',
  endedDate: '',
  endedTime: '',
  details: '',
  technicianName: ''
})

/** Parts dari API wall-clock — tidak digeser timezone browser. */
const formFromActivity = activity => {
  const started = splitWallClock(activity.startedAt) || { date: '', time: '' }
  const ended = splitWallClock(activity.endedAt) || { date: '', time: '' }

  return {
    code: activity.breakdownCode || '',
    position: activity.positionStatus || 'BD',
    startedDate: started.date,
    startedTime: started.time,
    endedDate: ended.date,
    endedTime: ended.time,
    details: activity.details || '',
    technicianName: activity.technicianName || ''
  }
}

const ActivityDialog = ({ open, breakdownId, activities, activity, onClose, onSaved }) => {
  const { user } = useAuth()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const editing = Boolean(activity?.id)

  const handledByName = editing
    ? activity.handledByName || '—'
    : user?.fullName || user?.username || 'Signed-in user'

  useEffect(() => {
    if (!open) return
    setForm(activity?.id ? formFromActivity(activity) : empty())
  }, [open, activity])

  const setField = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await arkaApi.patch(`/breakdowns/${breakdownId}/activities/${activity.id}`, form)
        toast.success('Activity updated')
      } else {
        await arkaApi.post(`/breakdowns/${breakdownId}/activities`, form)
        toast.success('Activity added')
      }
      onSaved()
    } catch (error) {
      toast.error(error?.response?.data?.error || (editing ? 'Could not update the activity' : 'Could not add the activity'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle>{editing ? 'Edit activity' : 'Add activity'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={4} sx={{ mt: 0 }}>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Activity code'
              value={form.code}
              onChange={event => setField('code', event.target.value)}
              options={(activities || []).map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Position'
              value={form.position}
              onChange={event => setField('position', event.target.value)}
              options={POSITIONS}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <CustomTextField
              fullWidth
              type='date'
              label='Start date'
              value={form.startedDate}
              onChange={event => setField('startedDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <CustomTextField
              fullWidth
              type='time'
              label='Start time'
              value={form.startedTime}
              onChange={event => setField('startedTime', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <CustomTextField
              fullWidth
              type='date'
              label='End date'
              value={form.endedDate}
              onChange={event => setField('endedDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <CustomTextField
              fullWidth
              type='time'
              label='End time'
              value={form.endedTime}
              onChange={event => setField('endedTime', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label='Mechanics'
              value={form.technicianName}
              onChange={event => setField('technicianName', event.target.value)}
              placeholder='Names of the mechanics'
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField fullWidth label='Handled by' value={handledByName} disabled />
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              label='Details'
              value={form.details}
              onChange={event => setField('details', event.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button color='secondary' onClick={onClose}>
          Back
        </Button>
        <Button variant='contained' disabled={saving} onClick={handleSave}>
          Save activity
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ActivityDialog
