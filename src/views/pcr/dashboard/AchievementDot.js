/**
 * Colored status dot for Achievement % cells.
 */

import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

import { formatAchievement, getAchievementColor } from './achievementColor'

/**
 * @param {{ ach: number | null | undefined, showLabel?: boolean }} props
 */
const AchievementDot = ({ ach, showLabel = true }) => {
  const theme = useTheme()
  const colorKey = getAchievementColor(ach)

  if (colorKey == null) {
    return (
      <Box component='span' sx={{ color: 'text.disabled' }}>
        {showLabel ? formatAchievement(ach) : null}
      </Box>
    )
  }

  const palette = theme.palette[colorKey]

  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        fontWeight: 600,
        color: palette.main
      }}
    >
      <Box
        component='span'
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: palette.main,
          flexShrink: 0
        }}
      />
      {showLabel ? formatAchievement(ach) : null}
    </Box>
  )
}

export default AchievementDot
