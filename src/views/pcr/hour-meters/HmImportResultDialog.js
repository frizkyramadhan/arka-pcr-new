/**
 * Dialog hasil import hour meter — ringkasan sukses/gagal dengan detail error per baris.
 */
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

const formatDisplayValue = value => {
  if (value === null || value === undefined || value === '') return '(kosong)'

  return String(value)
}

const HmImportResultDialog = ({ open, result, onClose }) => {
  if (!result) return null

  const { imported = 0, created = 0, updated = 0, restored = 0, errors = [], message, failed } = result
  const hasErrors = errors.length > 0
  const hasSuccess = imported > 0

  const summaryParts = []
  if (created) summaryParts.push(`${created} dibuat`)
  if (updated) summaryParts.push(`${updated} diperbarui`)
  if (restored) summaryParts.push(`${restored} dipulihkan`)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg' scroll='paper'>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon
          icon={failed && !hasSuccess ? 'tabler:alert-circle' : hasErrors ? 'tabler:alert-triangle' : 'tabler:circle-check'}
          fontSize='1.5rem'
        />
        Hasil Import Hour Meters
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        {failed && !hasSuccess ? (
          <Alert severity='error' icon={<Icon icon='tabler:x' />} sx={{ mb: hasErrors ? 4 : 0 }}>
            <AlertTitle>Import gagal</AlertTitle>
            {message || 'Tidak ada data yang berhasil diimport. Periksa detail error di bawah.'}
          </Alert>
        ) : null}

        {hasSuccess ? (
          <Alert severity='success' icon={<Icon icon='tabler:check' />} sx={{ mb: hasErrors ? 4 : 0 }}>
            <AlertTitle>Import berhasil</AlertTitle>
            <Typography variant='body2'>
              {summaryParts.length > 0
                ? `Total ${imported} record: ${summaryParts.join(', ')}.`
                : `${imported} record berhasil diproses.`}
              {hasErrors ? ` ${errors.length} baris dilewati karena error.` : ''}
            </Typography>
          </Alert>
        ) : null}

        {hasErrors ? (
          <Box>
            <Typography variant='h6' sx={{ mb: 3 }}>
              Detail Error ({errors.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {errors.map((item, index) => (
                <Alert
                  key={`${item.row}-${item.column}-${index}`}
                  severity='error'
                  variant='outlined'
                  icon={<Icon icon='tabler:file-alert' />}
                >
                  <AlertTitle sx={{ mb: 1.5 }}>Baris {item.row}</AlertTitle>
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    <Typography variant='body2'>
                      <strong>Kolom:</strong>{' '}
                      <Box component='code' sx={{ fontFamily: 'monospace' }}>
                        {item.column}
                      </Box>
                    </Typography>
                    <Typography variant='body2'>
                      <strong>Nilai:</strong>{' '}
                      <Box component='code' sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {formatDisplayValue(item.value)}
                      </Box>
                    </Typography>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography variant='body2'>
                      <strong>Pesan:</strong> {item.message}
                    </Typography>
                  </Box>
                </Alert>
              ))}
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 5, py: 3 }}>
        <Button variant='contained' onClick={onClose}>
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default HmImportResultDialog
