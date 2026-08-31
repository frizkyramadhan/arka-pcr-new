/**
 * Filter bar inspection — component, tipe & rating.
 */
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import SearchableSelect from 'src/@core/components/mui/searchable-select'

import {
  ALL_INSPECTIONS_SLUG,
  INSPECTION_TYPE_OPTIONS
} from 'src/views/pcr/inspections/inspectionMeta'

const RATING_OPTIONS = ['A', 'B', 'C', 'X']

const InspectionFilters = ({
  typeSlug,
  ratingFilter,
  componentFilter,
  componentOptions = [],
  onTypeChange,
  onRatingChange,
  onComponentChange
}) => {
  const ratingValue = ratingFilter || 'all'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: { xs: 3, lg: 4 },
        flex: 1,
        width: '100%',
        minWidth: 0,
        p: 3,
        borderRadius: 1,
        border: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper'
      }}
    >
      <Box sx={{ flex: { lg: '0 0 240px' }, minWidth: { xs: '100%', sm: 220 } }}>
        <Typography
          variant='caption'
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            mb: 1.5,
            display: 'block'
          }}
        >
          Component
        </Typography>
        <SearchableSelect
          size='small'
          value={componentFilter}
          onChange={event => onComponentChange(event.target.value)}
          placeholder='Search component…'
          options={[
            { value: '', label: 'All Components' },
            ...componentOptions.map(item => ({ value: String(item.idMod), label: item.label }))
          ]}
        />
      </Box>

      <Divider flexItem orientation='vertical' sx={{ display: { xs: 'none', lg: 'block' } }} />
      <Divider sx={{ display: { xs: 'block', lg: 'none' } }} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant='caption'
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            mb: 1.5,
            display: 'block'
          }}
        >
          Inspection Type
        </Typography>
        <ToggleButtonGroup
          exclusive
          size='small'
          value={typeSlug}
          onChange={(_event, value) => value && onTypeChange(value)}
          sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 1, borderColor: 'divider' } }}
        >
          <ToggleButton value={ALL_INSPECTIONS_SLUG} sx={{ textTransform: 'none', px: 2 }}>
            All
          </ToggleButton>
          {INSPECTION_TYPE_OPTIONS.map(item => (
            <ToggleButton key={item.slug} value={item.slug} sx={{ textTransform: 'none', px: 2 }}>
              <Box component='span' sx={{ display: { xs: 'none', lg: 'inline' } }}>
                {item.label}
              </Box>
              <Box component='span' sx={{ display: { xs: 'inline', lg: 'none' } }}>
                {item.shortLabel}
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider flexItem orientation='vertical' sx={{ display: { xs: 'none', md: 'block' } }} />
      <Divider sx={{ display: { xs: 'block', md: 'none' } }} />

      <Box sx={{ flex: { md: '0 0 auto' } }}>
        <Typography
          variant='caption'
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            mb: 1.5,
            display: 'block'
          }}
        >
          Rating
        </Typography>
        <ToggleButtonGroup
          exclusive
          size='small'
          value={ratingValue}
          onChange={(_event, value) => value && onRatingChange(value === 'all' ? '' : value)}
          sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 1, borderColor: 'divider' } }}
        >
          <ToggleButton value='all' sx={{ textTransform: 'none', px: 2.5 }}>
            All
          </ToggleButton>
          {RATING_OPTIONS.map(code => (
            <ToggleButton key={code} value={code} sx={{ textTransform: 'none', px: 2.5, fontWeight: 600 }}>
              {code}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  )
}

export default InspectionFilters
