/**
 * Toolbar list Maintenance Actual: export/import Excel (actual + temuan) dan Add Actual.
 * addHref: jika ada, tombol sebagai Link ke halaman add; jika tidak, pakai onClick toggle (drawer).
 */
import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Icon from 'src/@core/components/icon'

const TableHeader = props => {
  const { toggle, addHref, onExport, onImport } = props

  const buttonContent = (
    <>
      <Icon fontSize='1.125rem' icon='tabler:plus' />
      Add Actual
    </>
  )

  return (
    <Box
      sx={{
        py: 4,
        px: 6,
        rowGap: 2,
        columnGap: 4,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}
    >
      {onExport && (
        <Tooltip title='Export actuals and findings for the current filters'>
          <IconButton size='small' sx={{ color: 'text.secondary' }} onClick={onExport}>
            <Icon icon='tabler:file-spreadsheet' />
          </IconButton>
        </Tooltip>
      )}
      {onImport && (
        <Tooltip title='Import Excel'>
          <IconButton size='small' sx={{ color: 'text.secondary' }} component='label' htmlFor='maintenance-actual-import'>
            <Icon icon='tabler:file-upload' />
            <input
              id='maintenance-actual-import'
              type='file'
              accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              hidden
              onChange={onImport}
            />
          </IconButton>
        </Tooltip>
      )}
      {addHref ? (
        <Button component={Link} href={addHref} variant='contained' sx={{ '& svg': { mr: 2 } }}>
          {buttonContent}
        </Button>
      ) : (
        <Button onClick={toggle} variant='contained' sx={{ '& svg': { mr: 2 } }}>
          {buttonContent}
        </Button>
      )}
    </Box>
  )
}

export default TableHeader
