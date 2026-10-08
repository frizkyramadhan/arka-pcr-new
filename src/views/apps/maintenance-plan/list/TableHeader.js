import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

const TableHeader = props => {
  const { onExport, onImport } = props

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
          <Tooltip title='Export Project, Year, Month, Unit, Plan Date, Maintenance Type'>
          <IconButton size='small' sx={{ color: 'text.secondary' }} onClick={onExport}>
            <Icon icon='tabler:file-spreadsheet' />
          </IconButton>
        </Tooltip>
      )}
      {onImport && (
        <Tooltip title='Import Excel'>
          <IconButton size='small' sx={{ color: 'text.secondary' }} component='label' htmlFor='maintenance-plan-import'>
            <Icon icon='tabler:file-upload' />
            <input
              id='maintenance-plan-import'
              type='file'
              accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              hidden
              onChange={onImport}
            />
          </IconButton>
        </Tooltip>
      )}
      <Button component={Link} href='/maintenance-plans/add' variant='contained' sx={{ '& svg': { mr: 2 } }}>
        <Icon fontSize='1.125rem' icon='tabler:plus' />
        Add Plan
      </Button>
    </Box>
  )
}

export default TableHeader
