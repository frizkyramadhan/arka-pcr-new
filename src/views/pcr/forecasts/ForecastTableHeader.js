// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'

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
        <SearchableSelect
          label='Quarter'
          value={filters.quarter}
          onChange={e => onFilterChange('quarter', e.target.value)}
          options={QUARTER_OPTIONS.map(q => ({ value: q, label: q || 'All' }))}
          sx={{ minWidth: 120 }}
        />
        <SearchableSelect
          label='Status'
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          options={STATUS_OPTIONS}
          sx={{ minWidth: 130 }}
        />
        <SearchableSelect
          label='BA PCR'
          value={filters.baPcrStatus}
          onChange={e => onFilterChange('baPcrStatus', e.target.value)}
          options={BA_STATUS_OPTIONS}
          sx={{ minWidth: 150 }}
        />
        {showProjectFilter ? (
          <SearchableSelect
            label='Project'
            value={filters.projectCode}
            onChange={e => onFilterChange('projectCode', e.target.value)}
            placeholder='Search project…'
            options={[
              { value: '', label: 'All projects' },
              ...projects.map(project => ({ value: project.project_code, label: project.project_code }))
            ]}
            sx={{ minWidth: 140 }}
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
