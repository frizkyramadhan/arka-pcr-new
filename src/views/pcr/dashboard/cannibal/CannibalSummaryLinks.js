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

const LINKS = [
  { label: 'Cannibal List', href: '/cannibals' },
  { label: 'Approval Queue', href: '/cannibals-approvals' },
  { label: 'Cannibal Report', href: '/reports/cannibals' },
  { label: 'PCR Dashboard', href: '/dashboard' }
]

const CannibalSummaryLinks = () => (
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
            Quick Links
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Jump to cannibal operations and reports
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {LINKS.map(link => (
            <Button key={link.href} component={Link} href={link.href} variant='tonal' size='small'>
              {link.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  </Grid>
)

export default CannibalSummaryLinks
