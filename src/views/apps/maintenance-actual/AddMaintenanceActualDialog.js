/**
 * Add Maintenance Actual dialog (unit detail). Same form as the add page, locked to this unit.
 */
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import MaintenanceActualForm from 'src/views/apps/maintenance-actual/MaintenanceActualForm'

const CustomCloseButton = styled(IconButton)(({ theme }) => ({
  top: 0,
  right: 0,
  color: 'grey.500',
  position: 'absolute',
  boxShadow: theme.shadows[2],
  transform: 'translate(10px, -10px)',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: `${theme.palette.background.paper} !important`,
  '&:hover': {
    transform: 'translate(7px, -5px)'
  }
}))

const AddMaintenanceActualDialog = ({
  open,
  onClose,
  fleetUnitId,
  presetPlanDetailId = null,
  presetYear = null,
  presetMonth = null,
  onSaved
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      scroll='paper'
      sx={{ '& .MuiDialog-paper': { overflow: 'visible' } }}
    >
      <DialogTitle sx={{ p: 4 }}>
        <Typography variant='h6' component='span'>
          Add Maintenance Actual
        </Typography>
        <CustomCloseButton aria-label='close' onClick={onClose}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </CustomCloseButton>
      </DialogTitle>
      <DialogContent sx={{ px: theme => theme.spacing(5), pb: theme => theme.spacing(5) }}>
        {open ? (
          <MaintenanceActualForm
            mode='add'
            embedded
            lockedFleetUnitId={fleetUnitId}
            presetPlanDetailId={presetPlanDetailId}
            presetYear={presetYear}
            presetMonth={presetMonth}
            onCancel={onClose}
            onSaved={() => {
              onSaved?.()
              onClose?.()
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default AddMaintenanceActualDialog
