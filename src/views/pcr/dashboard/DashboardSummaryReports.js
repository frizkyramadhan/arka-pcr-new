/**
 * Quick links to PCR summary report pages — prominent strip below KPI row.
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

const REPORT_LINKS = [
  { label: 'Forecast', href: '/reports/forecasts', icon: 'tabler:chart-dots' },
  { label: 'PCR / WO', href: '/reports/pcr', icon: 'tabler:tool' },
  { label: 'Cannibal Report', href: '/reports/cannibals', icon: 'tabler:arrows-shuffle' },
  { label: 'Cannibal Dashboard', href: '/dashboard/cannibal', icon: 'tabler:layout-dashboard' },
  { label: 'SOS', href: '/reports/sos', icon: 'tabler:droplet' },
  { label: 'Inspections', href: '/reports/inspections', icon: 'tabler:clipboard-check' },
  { label: 'Condition', href: '/reports/conditions', icon: 'tabler:activity' }
]

const DashboardSummaryReports = () => (
  <Grid item xs={12}>
    <Card
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        backgroundImage: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.background.paper} 40%)`
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
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main'
            })}
          >
            <Icon icon='tabler:report-analytics' fontSize='1.25rem' />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, mb: 0.25 }}>
              Summary Reports
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Jump to operational report summaries
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {REPORT_LINKS.map(link => (
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

export default DashboardSummaryReports
