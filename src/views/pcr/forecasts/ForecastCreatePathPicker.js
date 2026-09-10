/**
 * Create forecast — choose Normal PCR vs Warranty before PCR type / planning fields.
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

const PATH_OPTIONS = {
  normal: {
    value: 'normal',
    title: 'Normal PCR',
    subtitle: 'PTA Reman · New Component · Repair',
    description:
      'Full BA approval through President Director. Choose supply type below. Use this path if warranty does not apply or was rejected.',
    icon: 'tabler:package',
    color: 'primary'
  },
  warranty: {
    value: 'warranty',
    title: 'Warranty',
    subtitle: 'Pergantian Warranty',
    description:
      'Short approval: PS → PM → PLM only. No PCR type fields. Only when component life is still under policy.',
    icon: 'tabler:shield-check',
    color: 'warning'
  }
}

const PathCard = ({ option, selected, onSelect }) => {
  const theme = useTheme()
  const palette = theme.palette[option.color]
  const isSelected = selected === option.value

  return (
    <Box
      role='button'
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onSelect(option.value)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(option.value)
        }
      }}
      sx={{
        p: { xs: 3, sm: 4 },
        height: '100%',
        cursor: 'pointer',
        borderRadius: 2,
        border: `2px solid ${isSelected ? palette.main : theme.palette.divider}`,
        bgcolor: isSelected ? alpha(palette.main, 0.08) : 'background.paper',
        transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow']),
        '&:hover': {
          borderColor: palette.main,
          boxShadow: theme.shadows[2]
        },
        '&:focus-visible': {
          outline: `2px solid ${palette.main}`,
          outlineOffset: 2
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(palette.main, 0.12),
            color: palette.main,
            flexShrink: 0
          }}
        >
          <Icon icon={option.icon} fontSize='1.35rem' />
        </Box>
        {isSelected ? <CustomChip rounded skin='light' size='small' label='Selected' color={option.color} /> : null}
      </Box>
      <Typography variant='subtitle1' sx={{ fontWeight: 700, mb: 0.5 }}>
        {option.title}
      </Typography>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        {option.subtitle}
      </Typography>
      <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
        {option.description}
      </Typography>
    </Box>
  )
}

const ForecastCreatePathPicker = ({ value, onChange, underPolicy, lifePercent, error }) => {
  const showWarrantyOption = underPolicy

  return (
    <Grid item xs={12}>
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
          border: theme => `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
          bgcolor: theme => (error ? `${theme.palette.error.main}08` : 'action.hover')
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
            Forecast path
          </Typography>
          {underPolicy ? (
            <CustomChip
              rounded
              skin='light'
              size='small'
              color='info'
              label={`Under policy · ${Number(lifePercent).toFixed(1)}% life`}
            />
          ) : null}
        </Box>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 3, maxWidth: 720 }}>
          {showWarrantyOption
            ? 'This component is still under policy. Choose Warranty for a claim, or Normal PCR if warranty is not used or was rejected.'
            : 'Component life is at or above policy — only the Normal PCR path applies (supply type required).'}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={showWarrantyOption ? 6 : 12}>
            <PathCard option={PATH_OPTIONS.normal} selected={value} onSelect={onChange} />
          </Grid>
          {showWarrantyOption ? (
            <Grid item xs={12} md={6}>
              <PathCard option={PATH_OPTIONS.warranty} selected={value} onSelect={onChange} />
            </Grid>
          ) : null}
        </Grid>

        {error ? (
          <Typography variant='caption' color='error' sx={{ display: 'block', mt: 2 }}>
            {error}
          </Typography>
        ) : null}
      </Box>
    </Grid>
  )
}

export default ForecastCreatePathPicker
