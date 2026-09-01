/**
 * PCR Forecast list — filter grid selaras Units + aksi di bawah divider.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'

import Icon from 'src/@core/components/icon'
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
  { value: 'CLOSED', label: 'Closed' }
]

const BA_STATUS_OPTIONS = [
  { value: '', label: 'All BA PCR' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' }
]

const QUARTER_OPTIONS = ['', 'Q1', 'Q2', 'Q3', 'Q4']

const ForecastTableHeader = ({
  filters,
  onFilterChange,
  projects,
  showProjectFilter,
  canEdit,
  onAdd,
  onGenerate,
  onBulkRefresh,
  generating = false
}) => {
  return (
    <Box>
      <Box sx={{ px: 6, pt: 5, pb: 4 }}>
        <Grid container spacing={3} alignItems='flex-end'>
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
          {showProjectFilter ? (
            <Grid item xs={12} sm={6} md={2}>
              <SearchableSelect
                fullWidth
                size='small'
                label='Project'
                value={filters.projectCode}
                onChange={e => onFilterChange('projectCode', e.target.value)}
                placeholder='Search project…'
                options={[
                  { value: '', label: 'All projects' },
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
      {canEdit ? (
        <>
          <Divider />
          <Box sx={{ px: 6, py: 4, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Button variant='tonal' color='secondary' onClick={onBulkRefresh} disabled={generating}>
              Bulk Refresh
            </Button>
            <Button
              variant='tonal'
              color='info'
              onClick={onGenerate}
              disabled={generating}
              startIcon={
                generating ? <CircularProgress size={18} color='inherit' /> : <Icon icon='tabler:sparkles' />
              }
            >
              {generating ? 'Generating...' : 'Auto Generate'}
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
