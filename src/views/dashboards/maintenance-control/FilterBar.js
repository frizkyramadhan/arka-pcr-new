/**
 * Global filter bar for the Fundamental Maintenance Control dashboard (spec section 5):
 * Period (month), View (MTD / YTD), Site, and an optional Program. Under the controls a summary line shows the
 * date range actually counted and the cut-off, so users can see what every panel is scoped to.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import { formatDisplayDate } from 'src/utils/date-format'

import { formatDateTime } from './shared'

/** "YYYY-MM" for the current month — the default period. */
export const currentMonthValue = () => {
  const today = new Date()

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

/** Default filter state; Reset returns here. */
export const DEFAULT_FILTERS = { period: currentMonthValue(), mode: 'YTD', projectId: '', programId: '' }

/** Filters from the URL query; unknown or malformed values fall back to the defaults. */
export const filtersFromQuery = query => ({
  period: /^\d{4}-\d{2}$/.test(String(query.period ?? '')) ? String(query.period) : DEFAULT_FILTERS.period,
  mode: query.view === 'MTD' ? 'MTD' : 'YTD',
  projectId: typeof query.site === 'string' ? query.site : '',
  programId: typeof query.program === 'string' ? query.program : ''
})

/** URL query for a filter state (`?period=&view=&site=&program=`), shared by the dashboard and the print page. */
export const filtersToQuery = filters => {
  const query = { period: filters.period, view: filters.mode }
  if (filters.projectId) query.site = filters.projectId
  if (filters.programId) query.program = filters.programId

  return query
}

/** API params (year, month, mode, projectId, programId) for a filter state. */
export const filtersToApiParams = filters => {
  const [year, month] = filters.period.split('-').map(Number)

  return { year, month, mode: filters.mode, projectId: filters.projectId || undefined, programId: filters.programId || undefined }
}

/** Move a "YYYY-MM" value by whole months. */
const shiftMonth = (value, delta) => {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const VIEW_HINT = {
  MTD: 'Month to date: the selected month only',
  YTD: 'Year to date: 1 January to the end of the selected month'
}

/**
 * One filter: caption on top, control below. The filter row stretches every field to the tallest one and the
 * control slot fills the remaining height, so the toggle and buttons end up as tall as the text inputs.
 */
const Field = ({ label, hint, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', ...sx }}>
    <Typography
      variant='caption'
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}
    >
      {label}
      {hint && (
        <Tooltip title={hint} arrow>
          <Box component='span' sx={{ display: 'inline-flex', cursor: 'help' }}>
            <Icon icon='tabler:info-circle' fontSize='0.9rem' />
          </Box>
        </Tooltip>
      )}
    </Typography>
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', gap: 1 }}>{children}</Box>
  </Box>
)

/** Square bordered button beside the month input, same height as the input. */
const stepButtonSx = { width: 40, borderRadius: 1, border: theme => `1px solid ${theme.palette.divider}` }

const FilterBar = ({ filters, onChange, projects, programOptions, period, loading }) => {
  const set = patch => onChange({ ...filters, ...patch })
  const isDefault = Object.keys(DEFAULT_FILTERS).every(key => filters[key] === DEFAULT_FILTERS[key])
  const programName = programOptions.find(option => option.id === filters.programId)?.name

  return (
    <Card sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 4 }}>
        {/* Period: previous month, month picker, next month — buttons sit outside the input */}
        <Field label='Period'>
          <Tooltip title='Previous month'>
            <IconButton sx={stepButtonSx} onClick={() => set({ period: shiftMonth(filters.period, -1) })}>
              <Icon icon='tabler:chevron-left' fontSize='1.1rem' />
            </IconButton>
          </Tooltip>
          <CustomTextField
            type='month'
            value={filters.period}
            onChange={event => event.target.value && set({ period: event.target.value })}
            sx={{ width: 200, flexShrink: 0 }}
          />
          <Tooltip title='Next month'>
            <IconButton sx={stepButtonSx} onClick={() => set({ period: shiftMonth(filters.period, 1) })}>
              <Icon icon='tabler:chevron-right' fontSize='1.1rem' />
            </IconButton>
          </Tooltip>
        </Field>

        {/* View: MTD / YTD, stretched to the input height */}
        <Field label='View' hint={`${VIEW_HINT.MTD}. ${VIEW_HINT.YTD}.`}>
          <ToggleButtonGroup exclusive color='primary' value={filters.mode} onChange={(_, value) => value && set({ mode: value })}>
            {['MTD', 'YTD'].map(value => (
              <ToggleButton key={value} value={value} sx={{ px: 5, py: 0 }}>
                {value}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Field>

        {/* Site */}
        <Field label='Site' sx={{ width: 220 }}>
          <SearchableSelect
            value={filters.projectId}
            onChange={event => set({ projectId: event.target.value || '' })}
            placeholder='Search site…'
            options={[{ value: '', label: 'All Sites' }, ...projects.map(project => ({ value: project.value, label: project.value }))]}
          />
        </Field>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            variant='tonal'
            color='secondary'
            disabled={isDefault}
            startIcon={<Icon icon='tabler:refresh' fontSize='1rem' />}
            onClick={() => onChange({ ...DEFAULT_FILTERS, period: currentMonthValue() })}
          >
            Reset
          </Button>
        </Box>
      </Box>

      {/* Program: optional drill-down */}
      <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mr: 1 }}>
          Program
        </Typography>
        {[{ id: '', name: 'All Programs' }, ...programOptions].map(option => {
          const selected = filters.programId === option.id

          return (
            <CustomChip
              key={option.id || 'all'}
              label={option.name}
              size='small'
              skin={selected ? undefined : 'light'}
              color={selected ? 'primary' : 'secondary'}
              icon={selected ? <Icon icon='tabler:check' fontSize='0.9rem' /> : undefined}
              onClick={() => set({ programId: option.id })}
              sx={{ cursor: 'pointer', fontWeight: selected ? 600 : 400, '& .MuiChip-icon': { ml: 1 } }}
            />
          )
        })}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* What every panel is currently scoped to */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
        <Icon icon={loading ? 'tabler:loader-2' : 'tabler:filter'} fontSize='1rem' />
        {period ? (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Showing <strong>{filters.mode}</strong> {formatDisplayDate(period.start)} – {formatDisplayDate(period.end)} ·{' '}
            <strong>{filters.projectId || 'All sites'}</strong> · <strong>{programName || 'All programs'}</strong> · Cut-off{' '}
            {formatDisplayDate(period.cutoff)}
          </Typography>
        ) : (
          <Typography variant='body2'>Loading…</Typography>
        )}
        {period?.loadedAt && (
          <Tooltip arrow title='Latest change to a plan, actual, finding, or hour meter in this site scope. Loaded = when these numbers were calculated.'>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 1, cursor: 'help' }}
            >
              <Icon icon='tabler:refresh' fontSize='1rem' />
              Data last updated <strong>{formatDateTime(period.dataUpdatedAt)}</strong> · Loaded {formatDateTime(period.loadedAt)}
            </Typography>
          </Tooltip>
        )}
      </Box>
    </Card>
  )
}

export default FilterBar
