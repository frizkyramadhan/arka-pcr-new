/**
 * Cannibal list toolbar — filter grid selaras kolom tabel + aksi kanan.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

import {
  CANNIBAL_APPROVAL_FILTER_OPTIONS,
  CANNIBAL_LOGISTIC_FILTER_OPTIONS,
  CANNIBAL_STATUS_FILTER_OPTIONS
} from 'src/utils/cannibal-list-filters'

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const CannibalTableHeader = ({
  filters,
  onFilterChange,
  projects,
  canCreate,
  canExport,
  onCreate,
  onExport,
  showToolbarActions = true
}) => (
  <Box>
    <CardContent>
      <Typography variant='body2' sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
        Search Filters
      </Typography>
      <Grid container spacing={3} alignItems='flex-end'>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            label='BA No.'
            placeholder='e.g. BA-022C-2026'
            value={filters.noBa}
            onChange={e => onFilterChange('noBa', e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Project'
            value={filters.projectCode}
            onChange={e => onFilterChange('projectCode', e.target.value)}
            SelectProps={{
              displayEmpty: true,
              renderValue: selected => {
                if (!selected) return 'All projects'
                const project = projects.find(item => item.project_code === selected)

                return project ? `${project.project_code}${project.bowheer ? ` — ${project.bowheer}` : ''}` : selected
              }
            }}
            sx={filterFieldSx}
          >
            <MenuItem value=''>All projects</MenuItem>
            {projects.map(project => (
              <MenuItem key={project.project_code} value={project.project_code}>
                {project.project_code}
                {project.bowheer ? ` — ${project.bowheer}` : ''}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            type='date'
            label='Posting Date From'
            value={filters.postingDateFrom}
            onChange={e => onFilterChange('postingDateFrom', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            type='date'
            label='Posting Date To'
            value={filters.postingDateTo}
            onChange={e => onFilterChange('postingDateTo', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            label='Removed Unit No'
            placeholder='e.g. ADT 011'
            value={filters.removedUnitNo}
            onChange={e => onFilterChange('removedUnitNo', e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            label='Installed Unit No'
            placeholder='e.g. ADT 012'
            value={filters.installedUnitNo}
            onChange={e => onFilterChange('installedUnitNo', e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            label='PN'
            placeholder='Part number'
            value={filters.pn}
            onChange={e => onFilterChange('pn', e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            fullWidth
            size='small'
            label='Component'
            placeholder='Component description'
            value={filters.component}
            onChange={e => onFilterChange('component', e.target.value)}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Logistic Stmt'
            value={filters.logisticStatement}
            onChange={e => onFilterChange('logisticStatement', e.target.value)}
            sx={filterFieldSx}
          >
            {CANNIBAL_LOGISTIC_FILTER_OPTIONS.map(option => (
              <MenuItem key={option.value || 'all-logistic'} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Approval'
            value={filters.approvalLevel}
            onChange={e => onFilterChange('approvalLevel', e.target.value)}
            sx={filterFieldSx}
          >
            {CANNIBAL_APPROVAL_FILTER_OPTIONS.map(option => (
              <MenuItem key={option.value || 'all-approval'} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Status'
            value={filters.status}
            onChange={e => onFilterChange('status', e.target.value)}
            sx={filterFieldSx}
          >
            {CANNIBAL_STATUS_FILTER_OPTIONS.map(option => (
              <MenuItem key={option.value || 'all-status'} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
      </Grid>
    </CardContent>
    {showToolbarActions ? (
      <>
        <Divider />
        <Box
          sx={{
            py: 4,
            px: 6,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}
        >
          {canExport ? (
            <Button variant='tonal' color='secondary' startIcon={<Icon icon='tabler:download' />} onClick={onExport}>
              Export Excel
            </Button>
          ) : null}
          {canCreate ? (
            <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={onCreate}>
              Create BA
            </Button>
          ) : null}
        </Box>
      </>
    ) : null}
  </Box>
)

export default CannibalTableHeader
