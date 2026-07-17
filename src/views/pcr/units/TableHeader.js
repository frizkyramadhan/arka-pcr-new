/**
 * Units list filter bar — satu baris field + Sync from ARKFleet di bawah divider.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

import { UNIT_STATUS_FILTER_OPTIONS } from '@/lib/fleet-api/unit-status'

const statusSelectProps = (value, onChange) => ({
  displayEmpty: false,
  value,
  onChange: e => onChange(e.target.value),
  renderValue: selected => {
    const match = UNIT_STATUS_FILTER_OPTIONS.find(option => option.value === selected)

    return match?.label ?? selected
  }
})

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const TableHeader = props => {
  const {
    unitNoFilter,
    modelFilter,
    projectFilter,
    manufactureFilter,
    plantGroupFilter,
    statusFilter,
    handleUnitNoChange,
    handleModelChange,
    handleProjectChange,
    handleManufactureChange,
    handlePlantGroupChange,
    handleStatusChange,
    onSync,
    syncing,
    loading
  } = props

  const statusOptions = UNIT_STATUS_FILTER_OPTIONS

  return (
    <Box>
      <Box sx={{ px: 6, pt: 5, pb: 4 }}>
        <Grid container spacing={3} alignItems='flex-end'>
          <Grid item xs={12} sm={6} md={2}>
            <CustomTextField
              fullWidth
              size='small'
              value={unitNoFilter}
              label='Unit No'
              placeholder='e.g. ADT 011'
              onChange={e => handleUnitNoChange(e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
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
          <Grid item xs={12} sm={6} md={2}>
            <CustomTextField
              fullWidth
              size='small'
              value={projectFilter}
              label='Project'
              placeholder='e.g. 022C'
              onChange={e => handleProjectChange(e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
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
          <Grid item xs={12} sm={6} md={2}>
            <CustomTextField
              fullWidth
              size='small'
              value={plantGroupFilter}
              label='Plant group'
              placeholder='e.g. Compressor'
              onChange={e => handlePlantGroupChange(e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <CustomTextField
              select
              fullWidth
              size='small'
              value={statusFilter}
              label='Status'
              SelectProps={statusSelectProps(statusFilter, handleStatusChange)}
              sx={filterFieldSx}
            >
              {statusOptions.map(option => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
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
