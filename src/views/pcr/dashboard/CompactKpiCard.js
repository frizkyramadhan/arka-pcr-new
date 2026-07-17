/**
 * Compact KPI card — icon + title + value; description via tooltip.
 */

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

/**
 * @param {{ title: string, stats: string, description: string, avatarIcon: string, avatarColor?: string }} props
 */
const CompactKpiCard = ({ title, stats, description, avatarIcon, avatarColor = 'primary' }) => (
  <Tooltip title={description} arrow placement='top'>
    <Box sx={{ height: '100%' }}>
      <Card sx={{ height: '100%', cursor: 'help' }}>
        <CardContent
          sx={{
            py: 2.5,
            px: 3,
            '&:last-child': { pb: 2.5 },
            display: 'flex',
            alignItems: 'center',
            gap: 2.5
          }}
        >
          <CustomAvatar
            skin='light'
            variant='rounded'
            color={avatarColor}
            sx={{ width: 38, height: 38, flexShrink: 0 }}
          >
            <Icon icon={avatarIcon} fontSize='1.375rem' />
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
                whiteSpace: 'nowrap'
              }}
            >
              {title}
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: 1.2, fontWeight: 600 }}>
              {stats}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  </Tooltip>
)

export default CompactKpiCard
