/**
 * CannibalDialog — edit plant section in a modal (create uses /cannibals/create).
 */
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import CannibalPlantForm from 'src/views/pcr/cannibal/CannibalPlantForm'

const CannibalDialog = ({ open, onClose, onSave, initialData, defaultProjectCode }) => (
  <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth scroll='paper'>
    <DialogTitle sx={{ pb: 2 }}>
      Edit Plant Section
      <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
        One BA per component — REMOVE from source unit and INSTALL to target unit.
      </Typography>
    </DialogTitle>
    <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
      {open ? (
        <CannibalPlantForm
          active={open}
          initialData={initialData}
          defaultProjectCode={defaultProjectCode}
          onSave={onSave}
          onCancel={onClose}
          submitLabel='Save'
        />
      ) : null}
    </DialogContent>
  </Dialog>
)

export default CannibalDialog
