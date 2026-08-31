/**
 * Filter bar SOS — component & eval rating.
 */
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { SOS_EVAL_OPTIONS } from 'src/views/pcr/sos/sosEvalOptions'

import SearchableSelect from 'src/@core/components/mui/searchable-select'

const SosFilters = ({
  evalFilter,
  componentFilter,
  componentOptions = [],
  onEvalChange,
  onComponentChange
}) => {
  const evalValue = evalFilter || 'all'

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
          Eval Rating
        </Typography>
        <ToggleButtonGroup
          exclusive
          size='small'
          value={evalValue}
          onChange={(_event, value) => value && onEvalChange(value === 'all' ? '' : value)}
          sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 1, borderColor: 'divider' } }}
        >
          <ToggleButton value='all' sx={{ textTransform: 'none', px: 2.5 }}>
            All
          </ToggleButton>
          {SOS_EVAL_OPTIONS.map(code => (
            <ToggleButton key={code} value={code} sx={{ textTransform: 'none', px: 2.5, fontWeight: 600 }}>
              {code}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  )
}

export default SosFilters
