/**
 * Modal ketentuan import Excel Maintenance Plan / Actual.
 * Tampil sebelum user memilih file: alur kerja, kolom wajib/opsional, dan aturan import.
 * File dipilih dari tombol di modal; onFileChange menerima event input file yang sama seperti sebelumnya.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'
import Icon from 'src/@core/components/icon'

/** Warna chip status kolom. */
const RULE_COLOR = {
  Wajib: 'error',
  'Wajib bila ada temuan': 'warning',
  'Wajib (actual baru)': 'warning',
  Opsional: 'info',
  Diabaikan: 'secondary'
}

const PLAN_GUIDE = {
  title: 'Ketentuan Import Maintenance Plan',
  steps: [
    'Klik Export di daftar Plan untuk mengunduh template. File berisi baris yang sedang terfilter, atau hanya header bila kosong.',
    'Isi satu baris untuk satu unit pada satu tanggal plan.',
    'Simpan sebagai .xlsx, lalu klik Pilih File di bawah.'
  ],
  columns: [
    ['Project', 'Opsional', 'Bila diisi harus sama dengan project unit. Kosong = diambil dari unit.'],
    ['Year', 'Diabaikan', 'Diisi ulang dari Plan Date.'],
    ['Month', 'Diabaikan', 'Diisi ulang dari Plan Date.'],
    ['Unit', 'Wajib', 'Nomor unit sesuai master, contoh DT 010.'],
    ['Plan Date', 'Wajib', 'Format YYYY-MM-DD atau sel tanggal Excel.'],
    ['Maintenance Type', 'Wajib', 'Nama program sesuai menu Type, contoh Greasing.']
  ],
  notes: [
    'Import hanya menambah tanggal plan. Tanggal yang sudah ada tidak dihapus dan tidak diubah.',
    'Baris dengan unit, program, dan tanggal yang sama dengan data lama dilewati (dihitung "updated").',
    'Satu header plan dibuat otomatis per site, tahun, bulan, dan program.'
  ]
}

const ACTUAL_GUIDE = {
  title: 'Ketentuan Import Maintenance Actual',
  steps: [
    'Pastikan Maintenance Plan sudah dibuat. Actual hanya bisa menempel ke plan date yang sudah ada.',
    'Klik Export di daftar Actual. File berisi actual yang sudah ada dan plan date yang belum punya actual (sesuai filter; rentang tanggal memakai plan date untuk baris plan).',
    'Isi kolom pelaksanaan pada baris plan yang sudah dikerjakan. Baris yang tidak diisi akan dilewati.',
    'Untuk temuan: satu baris per temuan. Salin baris actual (Unit, Plan Date, Maintenance Type sama), lalu isi kolom temuan.',
    'Simpan sebagai .xlsx, lalu klik Pilih File di bawah.'
  ],
  columns: [
    ['Project', 'Opsional', 'Bila diisi harus sama dengan project unit.'],
    ['Year / Month', 'Diabaikan', 'Informasi dari plan.'],
    ['Unit', 'Wajib', 'Bersama Plan Date dan Maintenance Type untuk mencari plan date.'],
    ['Plan Date', 'Wajib', 'YYYY-MM-DD atau sel tanggal Excel.'],
    ['Maintenance Type', 'Wajib', 'Nama program sesuai menu Type.'],
    ['Register No', 'Opsional', 'Kosong = dibuat otomatis (PM-{project}.{yymm}-{seq}). Isi Register No lama untuk menambah temuan ke actual itu.'],
    ['Maintenance Date', 'Wajib (actual baru)', 'Tanggal pelaksanaan, YYYY-MM-DD.'],
    ['Time', 'Opsional', 'Jam pelaksanaan, HH:mm.'],
    ['Hour Meter', 'Opsional', 'Angka. Boleh kosong.'],
    ['Mechanics', 'Opsional', 'Nama mekanik, teks bebas.'],
    ['Remarks', 'Opsional', 'Catatan.'],
    ['QC Status', 'Opsional', 'PASS, FAIL, atau NA.'],
    ['Created By', 'Diabaikan', 'Otomatis diisi user yang mengimpor.'],
    ['Severity', 'Wajib bila ada temuan', 'Critical, Major, atau Minor.'],
    ['Finding', 'Wajib bila ada temuan', 'Uraian temuan.'],
    ['Component / Sub Component / Damage', 'Wajib bila ada temuan', 'Kode SAP.'],
    ['Component Name / Sub Component Name / Damage Name', 'Diabaikan', 'Informasi dari export.'],
    ['Finding Date', 'Opsional', 'Kosong = tanggal pelaksanaan.'],
    ['Closed On', 'Opsional', 'Isi bila temuan sudah ditutup.'],
    ['Finding Created By', 'Diabaikan', 'Otomatis diisi user yang mengimpor.']
  ],
  notes: [
    'Satu plan date hanya boleh punya satu actual. Actual dan temuan yang sudah ada tidak diubah dan tidak dihapus.',
    'Beberapa baris temuan dengan Unit, Plan Date, dan Maintenance Type yang sama menjadi satu actual.',
    'Bila salah satu kolom temuan diisi, Severity, Finding, Component, Sub Component, dan Damage wajib lengkap.',
    'Header lama (Unit No, Type, Date, HM, Actual PIC, Failure PIC) masih terbaca.'
  ]
}

const GUIDES = { plan: PLAN_GUIDE, actual: ACTUAL_GUIDE }

const ImportGuideDialog = ({ open, onClose, kind = 'plan', inputId, onFileChange }) => {
  const guide = GUIDES[kind] || PLAN_GUIDE

  /** Teruskan event file ke handler halaman, lalu tutup modal. */
  const handleFile = event => {
    onFileChange?.(event)
    onClose?.()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='paper'>
      <DialogTitle>{guide.title}</DialogTitle>
      <DialogContent dividers>
        {/* Alur kerja */}
        <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
          Alur
        </Typography>
        <Box component='ol' sx={{ m: 0, pl: 5, mb: 4 }}>
          {guide.steps.map(step => (
            <Typography component='li' variant='body2' key={step} sx={{ mb: 1 }}>
              {step}
            </Typography>
          ))}
        </Box>

        {/* Kolom wajib / opsional */}
        <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
          Kolom
        </Typography>
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 4 }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '30%' }}>Kolom</TableCell>
                <TableCell sx={{ width: '22%' }}>Status</TableCell>
                <TableCell>Keterangan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guide.columns.map(([name, rule, note]) => (
                <TableRow key={name}>
                  <TableCell sx={{ fontWeight: 500 }}>{name}</TableCell>
                  <TableCell>
                    <CustomChip size='small' skin='light' rounded color={RULE_COLOR[rule] || 'secondary'} label={rule} />
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{note}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Aturan tambahan */}
        <Alert severity='info' icon={<Icon icon='tabler:info-circle' />}>
          <Box component='ul' sx={{ m: 0, pl: 4 }}>
            {guide.notes.map(note => (
              <Typography component='li' variant='body2' key={note} sx={{ mb: 0.5 }}>
                {note}
              </Typography>
            ))}
          </Box>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ pt: theme => `${theme.spacing(4)} !important` }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Batal
        </Button>
        <Button variant='contained' component='label' htmlFor={inputId} startIcon={<Icon icon='tabler:file-upload' />}>
          Pilih File
          <input
            id={inputId}
            type='file'
            accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            hidden
            onChange={handleFile}
          />
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportGuideDialog
