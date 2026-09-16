/**
 * Compact KPI card — icon + title + value; description via tooltip.
 */

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

/**
 * @param {{
 *   title: string
 *   stats: string
 *   description: string
 *   avatarIcon: string
 *   avatarColor?: string
 *   emphasize?: boolean
 * }} props
 */
const CompactKpiCard = ({
  title,
  stats,
  description,
  avatarIcon,
  avatarColor = 'primary',
  emphasize = false
}) => (
  <Tooltip title={description} arrow placement='top'>
    <Box sx={{ height: '100%' }}>
      <Card
        sx={theme => ({
          height: '100%',
          cursor: 'help',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          border: `1px solid ${theme.palette.divider}`,
          backgroundImage: emphasize
            ? `linear-gradient(135deg, ${alpha(theme.palette[avatarColor]?.main ?? theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.paper} 55%)`
            : 'none',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4]
          }
        })}
      >
        <CardContent
          sx={{
            py: 2.75,
            px: 3,
            '&:last-child': { pb: 2.75 },
            display: 'flex',
            alignItems: 'center',
            gap: 2.5
          }}
        >
          <CustomAvatar
            skin='light'
            variant='rounded'
            color={avatarColor}
            sx={{ width: 42, height: 42, flexShrink: 0 }}
          >
            <Icon icon={avatarIcon} fontSize='1.4rem' />
          </CustomAvatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
                lineHeight: 1.25,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500
              }}
            >
              {title}
            </Typography>
            <Typography variant='h4' sx={{ lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {stats}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  </Tooltip>
)

export default CompactKpiCard
