/**
 * Dashboard section header — title + optional subtitle/meta chips.
 */

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

/**
 * @param {{
 *   title: string
 *   subtitle?: string
 *   icon?: string
 *   iconColor?: string
 *   action?: import('react').ReactNode
 * }} props
 */
const DashboardSectionHeader = ({ title, subtitle, icon, iconColor = 'primary', action }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 3,
      flexWrap: 'wrap',
      mb: 1
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, minWidth: 0 }}>
      {icon ? (
        <CustomAvatar skin='light' color={iconColor} variant='rounded' sx={{ width: 40, height: 40 }}>
          <Icon icon={icon} fontSize='1.25rem' />
        </CustomAvatar>
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='h5' sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
    {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
  </Box>
)

export default DashboardSectionHeader
