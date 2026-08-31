/**
 * Filter bar for PCR forecast approval queue.
 */
import Box from '@mui/material/Box'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import {
  FORECAST_APPROVAL_STAGE_FILTER_OPTIONS,
  FORECAST_BA_PCR_STATUS_FILTER_OPTIONS
} from 'src/utils/forecast-approval-workflow'

const QUARTER_OPTIONS = ['', 'Q1', 'Q2', 'Q3', 'Q4']

const ForecastApprovalTableHeader = ({ filters, onFilterChange, projects, showProjectFilter }) => {
  return (
    <Box
      sx={{
        py: 4,
        px: 6,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        alignItems: 'center'
      }}
    >
      <CustomTextField
        label='Unit No.'
        value={filters.unitNo}
        onChange={e => onFilterChange('unitNo', e.target.value)}
        sx={{ minWidth: 120 }}
      />
      <SearchableSelect
        label='Quarter'
        value={filters.quarter}
        onChange={e => onFilterChange('quarter', e.target.value)}
        options={QUARTER_OPTIONS.map(q => ({ value: q, label: q || 'All' }))}
        sx={{ minWidth: 110 }}
      />
      <SearchableSelect
        label='Status BA PCR'
        value={filters.baPcrStatus}
        onChange={e => onFilterChange('baPcrStatus', e.target.value)}
        options={FORECAST_BA_PCR_STATUS_FILTER_OPTIONS}
        sx={{ minWidth: 150 }}
      />
      <SearchableSelect
        label='Approval Stage'
        value={filters.statusBaPcr}
        onChange={e => onFilterChange('statusBaPcr', e.target.value)}
        options={FORECAST_APPROVAL_STAGE_FILTER_OPTIONS}
        sx={{ minWidth: 220 }}
      />
      {showProjectFilter ? (
        <SearchableSelect
          label='Site'
          value={filters.projectCode}
          onChange={e => onFilterChange('projectCode', e.target.value)}
          placeholder='Search site…'
          options={[
            { value: '', label: 'All sites' },
            ...projects.map(project => ({ value: project.project_code, label: project.project_code }))
          ]}
          sx={{ minWidth: 120 }}
        />
      ) : null}
      <CustomTextField
        type='month'
        label='Plan Period'
        value={filters.planMonth}
        onChange={e => onFilterChange('planMonth', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />
    </Box>
  )
}

export default ForecastApprovalTableHeader
