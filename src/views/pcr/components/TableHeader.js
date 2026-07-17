// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

const TableHeader = props => {
  const { value, handleFilter, onAdd, onImport, canEdit } = props

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
        justifyContent: 'space-between'
      }}
    >
      <CustomTextField
        value={value}
        placeholder='Search Component'
        onChange={e => handleFilter(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position='start'>
              <Icon icon='tabler:search' fontSize='1.25rem' />
            </InputAdornment>
          )
        }}
        sx={{ maxWidth: 280 }}
      />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {canEdit ? (
          <>
            <Button component='label' variant='tonal' color='secondary'>
              Import Excel
              <input hidden type='file' accept='.xlsx' onChange={onImport} />
            </Button>
            <Button variant='contained' onClick={onAdd} startIcon={<Icon icon='tabler:plus' />}>
              Add Component
            </Button>
          </>
        ) : null}
      </Box>
    </Box>
  )
}

export default TableHeader
