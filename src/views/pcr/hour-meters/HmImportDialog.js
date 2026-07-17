/**
 * Modal panduan import hour meter — ketentuan format & alur sebelum memilih file Excel.
 */
import { useRef } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

const COLUMN_SPECS = [
  {
    key: 'id_hm',
    label: 'ID HM',
    description: 'Opsional — isi jika ingin mengubah data yang sudah ada',
    badge: 'Opsional',
    badgeColor: 'default'
  },
  {
    key: 'unit_no',
    label: 'Unit No',
    description: 'Nomor unit — dicocokkan dengan fleet equipment cache',
    badge: 'Wajib',
    badgeColor: 'error'
  },
  {
    key: 'description',
    label: 'Description',
    description: 'Hanya referensi — tidak diproses saat import',
    badge: 'Referensi',
    badgeColor: 'info'
  },
  {
    key: 'project_code',
    label: 'Project Code',
    description: 'Hanya referensi — tidak diproses saat import',
    badge: 'Referensi',
    badgeColor: 'info'
  },
  {
    key: 'hm_unit',
    label: 'HM Unit',
    description: 'Nilai hour meter unit',
    badge: 'Wajib',
    badgeColor: 'error'
  },
  {
    key: 'wh_day',
    label: 'WH/Day',
    description: 'Working hours per hari (0–24)',
    badge: 'Wajib',
    badgeColor: 'error'
  },
  {
    key: 'date_hm',
    label: 'Date HM',
    description: 'Tanggal pembacaan — sel Excel (yyyy-mm-dd) atau teks tanggal yang didukung Excel',
    badge: 'Wajib',
    badgeColor: 'error'
  }
]

const UPSERT_RULES = [
  {
    icon: 'tabler:hash',
    title: 'Ada kolom id_hm',
    detail: 'Record dengan ID tersebut akan di-update.'
  },
  {
    icon: 'tabler:calendar-event',
    title: 'Tanpa id_hm, unit + tanggal sudah ada',
    detail: 'Data lama di-update berdasarkan kombinasi unit dan tanggal.'
  },
  {
    icon: 'tabler:plus',
    title: 'Kombinasi baru',
    detail: 'Record baru akan dibuat.'
  }
]

const WORKFLOW_STEPS = [
  {
    step: 1,
    icon: 'tabler:filter',
    title: 'Filter & Export',
    detail: 'Terapkan filter di halaman, lalu klik Export Excel.'
  },
  {
    step: 2,
    icon: 'tabler:file-spreadsheet',
    title: 'Edit di Excel',
    detail: 'Ubah atau tambah baris sesuai kebutuhan.'
  },
  {
    step: 3,
    icon: 'tabler:upload',
    title: 'Import kembali',
    detail: 'Upload file — data ter-update tanpa duplikat.'
  }
]

const sectionPaperSx = {
  p: 4,
  height: '100%',
  border: theme => `1px solid ${theme.palette.divider}`
}

const HmImportDialog = ({ open, onClose, onImport }) => {
  const fileInputRef = useRef(null)

  const handleChooseFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = event => {
    onImport(event)
    onClose()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg' scroll='paper'>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
          >
            <Icon icon='tabler:file-import' fontSize='1.35rem' />
          </Box>
          <Box>
            <Typography variant='h5' component='span'>
              Import Hour Meters
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
              Baca ketentuan di bawah sebelum memilih file Excel
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: 'background.default', py: 5 }}>
          <Alert severity='info' icon={<Icon icon='tabler:info-circle' />} sx={{ mb: 5 }}>
            File harus berformat <strong>.xlsx</strong> dengan header kolom yang sama persis seperti hasil{' '}
            <strong>Export Excel</strong> atau <strong>Template</strong>. Baris kosong akan dilewati otomatis.
          </Alert>

          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Typography variant='h6' sx={{ mb: 3 }}>
                Struktur Kolom Excel
              </Typography>
              <TableContainer component={Paper} variant='outlined'>
                <Table size='medium'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '18%' }}>Kolom</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '14%' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Keterangan</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {COLUMN_SPECS.map(column => (
                      <TableRow key={column.key} hover>
                        <TableCell>
                          <Typography
                            component='code'
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              color: 'text.primary'
                            }}
                          >
                            {column.key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size='small' label={column.badge} color={column.badgeColor} variant='outlined' />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{column.description}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant='caption' sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                <code>unit_no</code> harus cocok dengan data unit yang sudah di-sync ke fleet equipment cache.
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant='outlined' sx={sectionPaperSx}>
                <Typography variant='h6' sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Icon icon='tabler:refresh' fontSize='1.25rem' />
                  Perilaku Import
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {UPSERT_RULES.map(rule => (
                    <Box key={rule.title} sx={{ display: 'flex', gap: 2.5 }}>
                      <Box
                        sx={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'action.selected'
                        }}
                      >
                        <Icon icon={rule.icon} fontSize='1.1rem' />
                      </Box>
                      <Box>
                        <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                          {rule.title}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {rule.detail}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant='outlined' sx={sectionPaperSx}>
                <Typography variant='h6' sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Icon icon='tabler:route' fontSize='1.25rem' />
                  Alur yang Disarankan
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {WORKFLOW_STEPS.map(step => (
                    <Box key={step.step} sx={{ display: 'flex', gap: 2.5 }}>
                      <Box
                        sx={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          fontWeight: 700,
                          fontSize: '1rem'
                        }}
                      >
                        {step.step}
                      </Box>
                      <Box>
                        <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 0.5 }}>
                          {step.title}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {step.detail}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Alert severity='success' variant='outlined' icon={<Icon icon='tabler:template' />}>
                <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 0.5 }}>
                  Data baru dari awal?
                </Typography>
                <Typography variant='body2'>
                  Unduh tombol <strong>Template</strong>, lalu isi baris baru dengan{' '}
                  <code>unit_no</code>, <code>hm_unit</code>, <code>wh_day</code>, dan <code>date_hm</code>.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 5, py: 4, gap: 2 }}>
          <Button size='large' onClick={onClose} color='secondary' variant='tonal'>
            Batal
          </Button>
          <Button
            size='large'
            variant='contained'
            onClick={handleChooseFile}
            startIcon={<Icon icon='tabler:upload' />}
          >
            Pilih File Excel
          </Button>
        </DialogActions>
      </Dialog>
      <input ref={fileInputRef} hidden type='file' accept='.xlsx' onChange={handleFileChange} />
    </>
  )
}

export default HmImportDialog
