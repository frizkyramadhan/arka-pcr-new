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

const REPORT_LINKS = [
  { label: 'Forecast', href: '/reports/forecasts' },
  { label: 'PCR / WO', href: '/reports/pcr' },
  { label: 'Cannibal Report', href: '/reports/cannibals' },
  { label: 'Cannibal Dashboard', href: '/dashboard/cannibal' },
  { label: 'SOS', href: '/reports/sos' },
  { label: 'Inspections', href: '/reports/inspections' },
  { label: 'Condition', href: '/reports/conditions' }
]

const DashboardSummaryReports = () => (
  <Grid item xs={12}>
    <Card>
      <CardContent
        sx={{
          py: 3,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3
        }}
      >
        <Box>
          <Typography variant='h6' sx={{ mb: 0.5 }}>
            Summary Reports
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Jump to operational report summaries
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {REPORT_LINKS.map(link => (
            <Button key={link.href} component={Link} href={link.href} variant='tonal' size='small'>
              {link.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  </Grid>
)

export default DashboardSummaryReports
