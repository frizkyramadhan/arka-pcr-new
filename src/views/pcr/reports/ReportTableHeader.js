/**
 * Report list toolbar — search, project/unit/component cascade filters, export.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const ReportTableHeader = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search unit, component, WO no…',
  showProjectFilter,
  projects,
  projectCode,
  onProjectChange,
  equipments,
  fleetUnitId,
  onUnitChange,
  componentOptions,
  idMod,
  onComponentChange,
  onExport,
  children
}) => (
  <Box>
    <CardContent>
      <Typography variant='body2' sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
        Search Filters
      </Typography>
      <Grid container spacing={3} alignItems='flex-end'>
        <Grid item xs={12} md={4} lg={3}>
          <CustomTextField
            fullWidth
            size='small'
            label='Search'
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                  <Icon fontSize='1.125rem' icon='tabler:search' />
                </Box>
              )
            }}
            sx={filterFieldSx}
          />
        </Grid>
        {showProjectFilter ? (
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <SearchableSelect
              size='small'
              label='Project'
              value={projectCode}
              onChange={e => onProjectChange(e.target.value)}
              placeholder='Search project…'
              options={[
                { value: '', label: 'All projects' },
                ...projects.map(project => ({
                  value: project.project_code,
                  label: `${project.project_code}${project.bowheer ? ` — ${project.bowheer}` : ''}`
                }))
              ]}
              sx={filterFieldSx}
            />
          </Grid>
        ) : null}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <SearchableSelect
            size='small'
            label='Unit'
            value={fleetUnitId}
            onChange={e => onUnitChange(e.target.value)}
            placeholder='Search unit…'
            options={[
              { value: '', label: 'All units' },
              ...equipments.map(unit => ({
                value: String(unit.id),
                label: `${unit.unit_no}${unit.description ? ` — ${unit.description}` : ''}`
              }))
            ]}
            sx={filterFieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <SearchableSelect
            size='small'
            label='Model / Component'
            value={idMod}
            onChange={e => onComponentChange(e.target.value)}
            disabled={Boolean(fleetUnitId) && componentOptions.length === 0}
            placeholder='Search component…'
            options={[
              { value: '', label: 'All components' },
              ...componentOptions.map(option => ({
                value: String(option.idMod),
                label: option.label
              }))
            ]}
            sx={filterFieldSx}
          />
        </Grid>
        {children}
        <Grid item xs={12} sm={6} md={4} lg={2} sx={{ ml: { lg: 'auto' } }}>
          <Button fullWidth variant='tonal' startIcon={<Icon icon='tabler:download' />} onClick={onExport}>
            Export Excel
          </Button>
        </Grid>
      </Grid>
    </CardContent>
  </Box>
)

export default ReportTableHeader
