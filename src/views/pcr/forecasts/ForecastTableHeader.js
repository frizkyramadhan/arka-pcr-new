// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
        <CustomTextField
          select
          label='Quarter'
          value={filters.quarter}
          onChange={e => onFilterChange('quarter', e.target.value)}
          sx={{ minWidth: 120 }}
        >
          {QUARTER_OPTIONS.map(q => (
            <MenuItem key={q || 'all'} value={q}>
              {q || 'All'}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          select
          label='Status'
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          sx={{ minWidth: 130 }}
        >
          {STATUS_OPTIONS.map(option => (
            <MenuItem key={option.value || 'all'} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          select
          label='BA PCR'
          value={filters.baPcrStatus}
          onChange={e => onFilterChange('baPcrStatus', e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {BA_STATUS_OPTIONS.map(option => (
            <MenuItem key={option.value || 'all'} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </CustomTextField>
        {showProjectFilter ? (
          <CustomTextField
            select
            label='Project'
            value={filters.projectCode}
            onChange={e => onFilterChange('projectCode', e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value=''>All projects</MenuItem>
            {projects.map(project => (
              <MenuItem key={project.project_code} value={project.project_code}>
                {project.project_code}
              </MenuItem>
            ))}
          </CustomTextField>
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
      {canEdit ? (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
      ) : null}
    </Box>
  )
}

export default ForecastTableHeader
