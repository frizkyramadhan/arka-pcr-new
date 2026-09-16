/**
 * Quick links for Cannibal dashboard.
 */

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'

const LINKS = [
  { label: 'Cannibal List', href: '/cannibals', icon: 'tabler:list' },
  { label: 'Approval Queue', href: '/cannibals-approvals', icon: 'tabler:checkbox' },
  { label: 'Cannibal Report', href: '/reports/cannibals', icon: 'tabler:report' },
  { label: 'PCR Dashboard', href: '/dashboard', icon: 'tabler:layout-dashboard' }
]

const CannibalSummaryLinks = () => (
  <Grid item xs={12}>
    <Card
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        backgroundImage: `linear-gradient(90deg, ${alpha(theme.palette.warning.main, 0.06)} 0%, ${theme.palette.background.paper} 40%)`
      })}
    >
      <CardContent
        sx={{
          py: 3.5,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box
            sx={theme => ({
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.warning.main, 0.12),
              color: 'warning.main'
            })}
          >
            <Icon icon='tabler:external-link' fontSize='1.25rem' />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, mb: 0.25 }}>
              Quick Links
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Jump to cannibal operations and reports
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {LINKS.map(link => (
            <Button
              key={link.href}
              component={Link}
              href={link.href}
              variant='tonal'
              size='small'
              startIcon={<Icon icon={link.icon} />}
            >
              {link.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  </Grid>
)

export default CannibalSummaryLinks
