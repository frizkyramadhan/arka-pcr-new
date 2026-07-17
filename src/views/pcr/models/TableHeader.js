/**
 * Models list filter bar + Sync from ARKFleet (same cache refresh as Units).
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const TableHeader = props => {
  const {
    modelFilter,
    manufactureFilter,
    plantGroupFilter,
    handleModelChange,
    handleManufactureChange,
    handlePlantGroupChange,
    onSync,
    syncing,
    loading
  } = props

  return (
    <Box>
      <Box sx={{ px: 6, pt: 5, pb: 4 }}>
        <Grid container spacing={3} alignItems='flex-end'>
          <Grid item xs={12} sm={6} md={4}>
            <CustomTextField
              fullWidth
              size='small'
              value={modelFilter}
              label='Model'
              placeholder='e.g. HM400-3R'
              onChange={e => handleModelChange(e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <CustomTextField
              fullWidth
              size='small'
              value={manufactureFilter}
              label='Manufacture'
              placeholder='e.g. Komatsu'
              onChange={e => handleManufactureChange(e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <CustomTextField
              fullWidth
              size='small'
              value={plantGroupFilter}
              label='Plant group'
              placeholder='e.g. ADT'
              onChange={e => handlePlantGroupChange(e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
        </Grid>
      </Box>
      <Divider />
      <Box sx={{ px: 6, py: 4, display: 'flex', alignItems: 'center' }}>
        <Button
          variant='tonal'
          color='secondary'
          disabled={loading || syncing}
          onClick={onSync}
          startIcon={<Icon icon='tabler:refresh' />}
        >
          {syncing ? 'Syncing…' : 'Sync from ARKFleet'}
        </Button>
      </Box>
    </Box>
  )
}

export default TableHeader
