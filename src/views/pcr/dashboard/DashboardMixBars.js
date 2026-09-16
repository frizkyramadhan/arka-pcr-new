/**
 * Horizontal mix bars for dashboard category distributions.
 */

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

const COLOR_CYCLE = ['primary', 'success', 'info', 'warning', 'error', 'secondary']

/**
 * @param {{
 *   title: string
 *   icon?: string
 *   iconColor?: string
 *   rows?: Array<{ key: string, label: string, count: number }>
 *   emptyHint?: string
 *   colorMap?: Record<string, string>
 * }} props
 */
const DashboardMixBars = ({
  title,
  icon = 'tabler:chart-bar',
  iconColor = 'primary',
  rows = [],
  emptyHint = 'No data',
  colorMap = {}
}) => {
  const theme = useTheme()
  const total = rows.reduce((sum, row) => sum + (row.count || 0), 0)
  const empty = total === 0

  return (
    <Card
      sx={{
        height: '100%',
        border: theme => `1px solid ${theme.palette.divider}`
      }}
    >
      <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3.5 }}>
          <CustomAvatar skin='light' color={iconColor} variant='rounded' sx={{ width: 36, height: 36 }}>
            <Icon icon={icon} fontSize='1.1rem' />
          </CustomAvatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {title}
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {empty ? emptyHint : `Total ${total}`}
            </Typography>
          </Box>
        </Box>

        {empty ? (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: theme => alpha(theme.palette.action.hover, 0.4)
            }}
          >
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {emptyHint}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {rows.map((row, index) => {
              const colorKey = colorMap[row.key] || COLOR_CYCLE[index % COLOR_CYCLE.length]
              const paletteColor = theme.palette[colorKey]?.main || theme.palette.primary.main
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0

              return (
                <Box key={row.key}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, pr: 2 }}>
                      {row.label}
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      <Box component='span' sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {row.count}
                      </Box>
                      {` · ${pct}%`}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={pct}
                    sx={{
                      height: 8,
                      borderRadius: 99,
                      bgcolor: alpha(paletteColor, 0.12),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 99,
                        bgcolor: paletteColor
                      }
                    }}
                  />
                </Box>
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default DashboardMixBars
