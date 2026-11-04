/**
 * Edit open breakdown inside a modal — same BreakdownForm wizard as the edit page.
 * Used from the Summary Breakdown board so operators stay on the report.
 */
import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import arkaApi from 'src/utils/arka-api'
import BreakdownForm from 'src/views/apps/breakdown/BreakdownForm'

const EditBreakdownDialog = ({ open, breakdownId, onClose, onSaved }) => {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!breakdownId) return
    setLoading(true)
    try {
      const response = await arkaApi.get(`/breakdowns/${breakdownId}`)
      setRow(response.data)
      setFormKey(value => value + 1)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Breakdown was not found')
      onClose?.()
    } finally {
      setLoading(false)
    }
  }, [breakdownId, onClose])

  useEffect(() => {
    if (!open || !breakdownId) {
      setRow(null)

      return
    }
    void load()
  }, [open, breakdownId, load])

  const refreshWo = async () => {
    if (!breakdownId || refreshing) return
    setRefreshing(true)
    try {
      const response = await arkaApi.post(`/breakdowns/${breakdownId}/refresh`)
      setRow(response.data)
      setFormKey(value => value + 1)
      toast.success('Work order refreshed from SAP')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not refresh the work order')
    } finally {
      setRefreshing(false)
    }
  }

  const title = row?.workOrder
    ? `Edit WO ${row.workOrder}`
    : row?.unitNo
      ? `Edit BD · ${row.unitNo}`
      : 'Edit breakdown'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='lg'
      scroll='paper'
      aria-labelledby='edit-breakdown-dialog-title'
    >
      <DialogTitle
        id='edit-breakdown-dialog-title'
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, pr: 2 }}
      >
        <Box>
          <Typography variant='h5' component='span'>
            {title}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
            Project, unit, dan waktu mulai tetap. Simpan di sini tanpa meninggalkan board.
          </Typography>
        </Box>
        <IconButton aria-label='Close' onClick={onClose} size='small'>
          <Icon icon='tabler:x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 4 }}>
        {loading || !row ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <BreakdownForm
            key={formKey}
            mode='edit'
            embedded
            initial={row}
            refreshing={refreshing}
            onRefresh={refreshWo}
            onCancel={onClose}
            onSaved={() => {
              onSaved?.(row.id)
              onClose?.()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EditBreakdownDialog
