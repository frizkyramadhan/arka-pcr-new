/**
 * Section card — judul + ikon untuk form/detail cannibal.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

const CannibalSectionCard = ({ title, subtitle, icon, iconColor = 'primary', children, sx, compact = false, fullHeight = false }) => (
  <Card
    variant='outlined'
    sx={{
      mb: compact ? 0 : 4,
      ...(fullHeight ? { height: '100%', display: 'flex', flexDirection: 'column' } : {}),
      ...sx
    }}
  >
    <CardContent
      sx={{
        ...(compact ? { p: theme => theme.spacing(6), '&:last-of-type': { pb: theme => theme.spacing(6) } } : {}),
        ...(fullHeight ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : {})
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: compact ? 2 : 2.5, mb: subtitle ? 2 : compact ? 2 : 3 }}>
        <CustomAvatar skin='light' color={iconColor} sx={{ width: compact ? 36 : 40, height: compact ? 36 : 40 }}>
          <Icon icon={icon} fontSize={compact ? '1.125rem' : '1.25rem'} />
        </CustomAvatar>
        <Box>
          <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ lineHeight: 1.3, fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant='caption' sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>
      {children}
    </CardContent>
  </Card>
)

export default CannibalSectionCard
