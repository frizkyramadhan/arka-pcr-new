/**
 * Report list toolbar — search, project/unit/component cascade filters, export.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

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
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Project'
              value={projectCode}
              onChange={e => onProjectChange(e.target.value)}
              SelectProps={{
                displayEmpty: true,
                renderValue: selected => {
                  if (!selected) return 'All projects'
                  const project = projects.find(item => item.project_code === selected)

                  return project
                    ? `${project.project_code}${project.bowheer ? ` — ${project.bowheer}` : ''}`
                    : selected
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
        ) : null}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Unit'
            value={fleetUnitId}
            onChange={e => onUnitChange(e.target.value)}
            SelectProps={{
              displayEmpty: true,
              renderValue: selected => {
                if (!selected) return 'All units'
                const unit = equipments.find(item => String(item.id) === String(selected))

                return unit ? `${unit.unit_no}${unit.description ? ` — ${unit.description}` : ''}` : selected
              }
            }}
            sx={filterFieldSx}
          >
            <MenuItem value=''>All units</MenuItem>
            {equipments.map(unit => (
              <MenuItem key={unit.id} value={String(unit.id)}>
                {unit.unit_no}
                {unit.description ? ` — ${unit.description}` : ''}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Model / Component'
            value={idMod}
            onChange={e => onComponentChange(e.target.value)}
            disabled={Boolean(fleetUnitId) && componentOptions.length === 0}
            SelectProps={{
              displayEmpty: true,
              renderValue: selected => {
                if (!selected) return 'All components'
                const option = componentOptions.find(item => String(item.idMod) === String(selected))

                return option?.label ?? selected
              }
            }}
            sx={filterFieldSx}
          >
            <MenuItem value=''>All components</MenuItem>
            {componentOptions.map(option => (
              <MenuItem key={option.idMod} value={String(option.idMod)}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
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
