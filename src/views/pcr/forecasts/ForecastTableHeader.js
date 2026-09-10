/**
 * PCR Forecast list — filter mengikuti kolom grid + aksi di bawah divider.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'

import { SOS_EVAL_OPTIONS } from 'src/views/pcr/sos/sosEvalOptions'

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'WARRANTY', label: 'Warranty' }
]

const BA_STATUS_OPTIONS = [
  { value: '', label: 'All BA PCR' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' }
]

const CBM_OPTIONS = [
  { value: '', label: 'All CBM' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ATTENTION', label: 'Attention' },
  { value: 'CRITICAL', label: 'Critical' }
]

const SOS_OPTIONS = [
  { value: '', label: 'All SOS' },
  ...SOS_EVAL_OPTIONS.map(value => ({ value, label: value }))
]

const QUARTER_OPTIONS = ['', 'Q1', 'Q2', 'Q3', 'Q4']

const ForecastTableHeader = ({
  filters,
  onFilterChange,
  projects,
  showProjectFilter,
  canEdit,
  onAdd,
  onBulkRefresh
}) => {
  return (
    <Box>
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
              label='HM Component'
              placeholder='e.g. 18.000'
              value={filters.hmComponent}
              onChange={e => onFilterChange('hmComponent', e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <CustomTextField
              fullWidth
              size='small'
              label='Policy'
              placeholder='e.g. 20.000'
              value={filters.policy}
              onChange={e => onFilterChange('policy', e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <CustomTextField
              fullWidth
              size='small'
              label='Life %'
              placeholder='e.g. 85'
              value={filters.lifePercent}
              onChange={e => onFilterChange('lifePercent', e.target.value)}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <SearchableSelect
              fullWidth
              size='small'
              label='SOS Rating'
              value={filters.ratingSos}
              onChange={e => onFilterChange('ratingSos', e.target.value)}
              options={SOS_OPTIONS}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <SearchableSelect
              fullWidth
              size='small'
              label='CBM Rating'
              value={filters.ratingCbm}
              onChange={e => onFilterChange('ratingCbm', e.target.value)}
              options={CBM_OPTIONS}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <CustomTextField
              fullWidth
              size='small'
              type='month'
              label='Plan Periode'
              value={filters.planMonth}
              onChange={e => onFilterChange('planMonth', e.target.value)}
              InputLabelProps={{ shrink: true }}
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
              label='Status'
              value={filters.status}
              onChange={e => onFilterChange('status', e.target.value)}
              options={STATUS_OPTIONS}
              sx={filterFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <SearchableSelect
              fullWidth
              size='small'
              label='BA PCR'
              value={filters.baPcrStatus}
              onChange={e => onFilterChange('baPcrStatus', e.target.value)}
              options={BA_STATUS_OPTIONS}
              sx={filterFieldSx}
            />
          </Grid>
        </Grid>
      </Box>
      {canEdit ? (
        <>
          <Divider />
          <Box sx={{ px: 6, py: 4, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Button variant='tonal' color='secondary' onClick={onBulkRefresh}>
              Bulk Refresh
            </Button>
            <Button variant='contained' onClick={onAdd} startIcon={<Icon icon='tabler:plus' />}>
              Add Forecast
            </Button>
          </Box>
        </>
      ) : null}
    </Box>
  )
}

export default ForecastTableHeader
