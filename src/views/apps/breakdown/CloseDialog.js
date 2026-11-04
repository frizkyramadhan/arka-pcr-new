/** Close dialog — resolution is required and saved on the breakdown. */
import { useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import toast from 'react-hot-toast'

import CustomTextField from 'src/@core/components/mui/text-field'
import arkaApi from 'src/utils/arka-api'

const localNow = () => {
  const date = new Date()
  const pad = value => String(value).padStart(2, '0')

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
}

const CloseDialog = ({ open, breakdownId, onClose, onSaved }) => {
  const now = useMemo(() => localNow(), [])
  const [resolution, setResolution] = useState('')
  const [finishedDate, setFinishedDate] = useState(now.date)
  const [finishedTime, setFinishedTime] = useState(now.time)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await arkaApi.post(`/breakdowns/${breakdownId}/close`, { resolution, finishedDate, finishedTime })
      toast.success('Breakdown closed')
      onSaved()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not close the breakdown')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Close breakdown</DialogTitle>
      <DialogContent>
        <Grid container spacing={4} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              type='date'
              label='Finish date'
              value={finishedDate}
              onChange={event => setFinishedDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              type='time'
              label='Finish time'
              value={finishedTime}
              onChange={event => setFinishedTime(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label='Resolution'
              value={resolution}
              onChange={event => setResolution(event.target.value.slice(0, 254))}
              helperText={`${resolution.length}/254`}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button color='secondary' onClick={onClose}>
          Back
        </Button>
        <Button variant='contained' disabled={saving} onClick={handleSave}>
          Close breakdown and WO
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CloseDialog
