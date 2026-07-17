/**
 * Compact unit information card — fields from fleet_equipment_cache.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import { formatDisplayDate } from 'src/utils/date-format'

import EquipmentStatusChip from 'src/views/pcr/units/EquipmentStatusChip'

const formatHm = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)

  return Number.isFinite(num) ? num.toLocaleString('id-ID') : '—'
}

const InfoItem = ({ label, value, children }) => (
  <Box>
    <Typography
      variant='body2'
      sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3, fontSize: '0.75rem' }}
    >
      {label}
    </Typography>
    {children ?? (
      <Typography variant='body1' sx={{ fontWeight: 500, mt: 0.5, fontSize: '0.875rem' }}>
        {value || '—'}
      </Typography>
    )}
  </Box>
)

const UnitInfoCompact = ({ unit, loading = false }) => (
  <Card>
    <CardContent sx={{ py: 4, px: 5, '&:last-child': { pb: 4 } }}>
      <Typography variant='h6' sx={{ fontWeight: 600, mb: 3, fontSize: '1.125rem' }}>
        Unit Information
      </Typography>

      {loading && !unit ? (
        <Grid container spacing={3}>
          {Array.from({ length: 10 }).map((_, index) => (
            <Grid key={index} item xs={6} sm={4} md={3}>
              <Skeleton variant='text' width='40%' height={16} />
              <Skeleton variant='text' width='70%' height={24} sx={{ mt: 0.5 }} />
            </Grid>
          ))}
        </Grid>
      ) : unit ? (
        <Grid container spacing={3}>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Unit No' value={unit.unit_no} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Project' value={unit.project_code} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Model' value={unit.model} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Manufacture' value={unit.manufacture} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Description' value={unit.description} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Plant Group' value={unit.plant_group} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Plant Type' value={unit.plant_type} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Status'>
              <Box sx={{ mt: 0.5 }}>
                <EquipmentStatusChip status={unit.unitstatus} />
              </Box>
            </InfoItem>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='Latest HM' value={formatHm(unit.latest_hm_unit)} />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <InfoItem label='HM Date' value={formatDisplayDate(unit.latest_hm_date)} />
          </Grid>
        </Grid>
      ) : (
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          No data
        </Typography>
      )}
    </CardContent>
  </Card>
)

export default UnitInfoCompact
