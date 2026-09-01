/**
 * Filter bar for PCR forecast approval queue — grid selaras Units / Forecast list.
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import {
  FORECAST_APPROVAL_STAGE_FILTER_OPTIONS,
  FORECAST_BA_PCR_STATUS_FILTER_OPTIONS
} from 'src/utils/forecast-approval-workflow'

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const QUARTER_OPTIONS = ['', 'Q1', 'Q2', 'Q3', 'Q4']

const ForecastApprovalTableHeader = ({ filters, onFilterChange, projects, showProjectFilter }) => {
  return (
    <Box sx={{ px: 6, pt: 5, pb: 4 }}>
      <Grid container spacing={3} alignItems='flex-end'>
        <Grid item xs={12} sm={6} md={2}>
          <CustomTextField
            fullWidth
            size='small'
            label='Unit No.'
            placeholder='e.g. E 077'
            value={filters.unitNo}
            onChange={e => onFilterChange('unitNo', e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <SearchableSelect
            fullWidth
            size='small'
            label='Quarter'
            value={filters.quarter}
            onChange={e => onFilterChange('quarter', e.target.value)}
            options={QUARTER_OPTIONS.map(q => ({ value: q, label: q || 'All' }))}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <SearchableSelect
            fullWidth
            size='small'
            label='Status BA PCR'
            value={filters.baPcrStatus}
            onChange={e => onFilterChange('baPcrStatus', e.target.value)}
            options={FORECAST_BA_PCR_STATUS_FILTER_OPTIONS}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <SearchableSelect
            fullWidth
            size='small'
            label='Approval Stage'
            value={filters.statusBaPcr}
            onChange={e => onFilterChange('statusBaPcr', e.target.value)}
            options={FORECAST_APPROVAL_STAGE_FILTER_OPTIONS}
            sx={filterFieldSx}
          />
        </Grid>
        {showProjectFilter ? (
          <Grid item xs={12} sm={6} md={2}>
            <SearchableSelect
              fullWidth
              size='small'
              label='Site'
              value={filters.projectCode}
              onChange={e => onFilterChange('projectCode', e.target.value)}
              placeholder='Search site…'
              options={[
                { value: '', label: 'All sites' },
                ...projects.map(project => ({ value: project.project_code, label: project.project_code }))
              ]}
              sx={filterFieldSx}
            />
          </Grid>
        ) : null}
        <Grid item xs={12} sm={6} md={2}>
          <CustomTextField
            fullWidth
            size='small'
            type='month'
            label='Plan Period'
            value={filters.planMonth}
            onChange={e => onFilterChange('planMonth', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={filterFieldSx}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default ForecastApprovalTableHeader
