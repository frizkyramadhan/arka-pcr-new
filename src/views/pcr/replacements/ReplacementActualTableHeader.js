/**
 * Replacement Actual list — filters similar to Forecast list (read-only view).
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSE', label: 'Close' }
]

const ReplacementActualTableHeader = ({ filters, onFilterChange, projects, showProjectFilter }) => (
  <Box sx={{ px: 6, pt: 5, pb: 4 }}>
    <Grid container spacing={3} alignItems='flex-end'>
      <Grid item xs={12} sm={6} md={2}>
        <CustomTextField
          fullWidth
          size='small'
          label='Model Unit'
          placeholder='e.g. HM400'
          value={filters.modelName}
          onChange={e => onFilterChange('modelName', e.target.value)}
          sx={filterFieldSx}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <CustomTextField
          fullWidth
          size='small'
          label='Unit No'
          placeholder='e.g. ADT 011'
          value={filters.unitNo}
          onChange={e => onFilterChange('unitNo', e.target.value)}
          sx={filterFieldSx}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <CustomTextField
          fullWidth
          size='small'
          label='Component'
          placeholder='e.g. ENGINE'
          value={filters.compDesc}
          onChange={e => onFilterChange('compDesc', e.target.value)}
          sx={filterFieldSx}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <CustomTextField
          fullWidth
          size='small'
          type='month'
          label='Rep Date'
          value={filters.repMonth}
          onChange={e => onFilterChange('repMonth', e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={filterFieldSx}
        />
      </Grid>
      {showProjectFilter ? (
        <Grid item xs={12} sm={6} md={2}>
          <SearchableSelect
            size='small'
            label='Project'
            value={filters.projectCode}
            onChange={e => onFilterChange('projectCode', e.target.value)}
            options={[
              { value: '', label: 'All projects' },
              ...projects.map(p => ({
                value: p.projectCode ?? p.code ?? p,
                label: p.projectCode ?? p.code ?? String(p)
              }))
            ]}
          />
        </Grid>
      ) : null}
      <Grid item xs={12} sm={6} md={2}>
        <SearchableSelect
          size='small'
          label='WO Status'
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          options={STATUS_OPTIONS}
          disableClearable
        />
      </Grid>
    </Grid>
  </Box>
)

export default ReplacementActualTableHeader
