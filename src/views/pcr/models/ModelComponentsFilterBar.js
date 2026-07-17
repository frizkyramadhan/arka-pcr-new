/**
 * Filter bar — commod panel (per kolom: component, type, policy, price).
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'

import CustomTextField from 'src/@core/components/mui/text-field'

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const ModelComponentsFilterBar = props => {
  const {
    compDescFilter,
    compTypeFilter,
    policyFilter,
    priceFilter,
    onCompDescChange,
    onCompTypeChange,
    onPolicyChange,
    onPriceChange
  } = props

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={3} alignItems='flex-end'>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            value={compDescFilter}
            label='Component'
            placeholder='Filter component…'
            onChange={e => onCompDescChange(e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            value={compTypeFilter}
            label='Type'
            placeholder='Filter type…'
            onChange={e => onCompTypeChange(e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            value={policyFilter}
            label='Policy (hrs)'
            placeholder='e.g. 5000'
            onChange={e => onPolicyChange(e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            value={priceFilter}
            label='Price'
            placeholder='e.g. 150000'
            onChange={e => onPriceChange(e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default ModelComponentsFilterBar
