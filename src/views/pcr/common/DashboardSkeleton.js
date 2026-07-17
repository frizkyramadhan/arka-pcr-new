/**
 * Loading skeleton for PCR Dashboard layout (KPI + charts + achievement table).
 */

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'

const DashboardSkeleton = () => (
  <Grid container spacing={6}>
    {[1, 2, 3, 4, 5, 6].map(key => (
      <Grid item xs={6} sm={4} md={2} key={key}>
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant='rounded' width={38} height={38} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant='text' width='70%' height={18} />
              <Skeleton variant='text' width='40%' height={28} />
            </Box>
          </Box>
        </Card>
      </Grid>
    ))}
    <Grid item xs={12}>
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
          <Box>
            <Skeleton variant='text' width={160} height={28} />
            <Skeleton variant='text' width={220} height={20} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6].map(key => (
              <Skeleton key={key} variant='rounded' width={88} height={32} />
            ))}
          </Box>
        </Box>
      </Card>
    </Grid>
    <Grid item xs={12} md={6}>
      <Card sx={{ p: 4, height: 360 }}>
        <Skeleton variant='text' width='55%' height={32} sx={{ mb: 2 }} />
        <Skeleton variant='text' width='40%' sx={{ mb: 4 }} />
        <Skeleton variant='rounded' height={240} />
      </Card>
    </Grid>
    <Grid item xs={12} md={6}>
      <Card sx={{ p: 4, height: 360 }}>
        <Skeleton variant='text' width='55%' height={32} sx={{ mb: 2 }} />
        <Skeleton variant='text' width='40%' sx={{ mb: 4 }} />
        <Skeleton variant='rounded' height={240} />
      </Card>
    </Grid>
    <Grid item xs={12} md={7}>
      <Card sx={{ p: 4 }}>
        <Skeleton variant='text' width='40%' height={32} sx={{ mb: 3 }} />
        {[1, 2, 3, 4].map(row => (
          <Skeleton key={row} variant='rounded' height={36} sx={{ mb: 1.5 }} />
        ))}
      </Card>
    </Grid>
    <Grid item xs={12} md={5}>
      <Card sx={{ p: 4 }}>
        <Skeleton variant='text' width='55%' height={32} sx={{ mb: 3 }} />
        {[1, 2, 3, 4, 5].map(row => (
          <Box key={row} sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Skeleton variant='text' width='30%' />
            <Skeleton variant='text' width='40%' />
            <Skeleton variant='rounded' width={60} height={24} />
          </Box>
        ))}
      </Card>
    </Grid>
  </Grid>
)

export default DashboardSkeleton
