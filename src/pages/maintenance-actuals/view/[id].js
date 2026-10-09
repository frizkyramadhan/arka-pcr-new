/**
 * Maintenance Actual detail — register no, execution, unit, findings, attachments.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'

import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import CustomChip from 'src/@core/components/mui/chip'
import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'
import ActualFailureSummary from 'src/views/apps/maintenance-actual/ActualFailureSummary'
import EntityAttachmentsSection from 'src/views/fms/EntityAttachmentsSection'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const unitStatusColor = {
  ACTIVE: 'success',
  'IN-ACTIVE': 'secondary',
  SOLD: 'info',
  SCRAP: 'error'
}

const ACTUAL_STATUS = {
  OPEN: { label: 'Open', color: 'info' },
  CLOSED: { label: 'Closed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'error' }
}

const QC_STATUS = {
  PASS: { label: 'Pass', color: 'success' },
  FAIL: { label: 'Fail', color: 'error' },
  NA: { label: 'N/A', color: 'secondary' }
}

const DetailField = ({ label, value, children }) => (
  <Box>
    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
      {label}
    </Typography>
    {children ?? (
      <Typography variant='body2' sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{value || '—'}</Typography>
    )}
  </Box>
)

const StatTile = ({ icon, label, value }) => (
  <Paper variant='outlined' sx={{ p: 3, height: '100%', borderRadius: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, color: 'text.secondary' }}>
      <Icon icon={icon} fontSize={20} />
      <Typography variant='caption'>{label}</Typography>
    </Box>
    <Typography variant='h6' sx={{ fontWeight: 600, lineHeight: 1.3 }}>{value || '—'}</Typography>
  </Paper>
)

const MaintenanceActualView = () => {
  const { id } = useRouter().query
  const { can } = useCan()
  const [actual, setActual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const canManageAttachments = can('maintenance-actual.update') || can('maintenance-actual.create')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    arkaApi
      .get(`/maintenance-actuals/${id}`)
      .then(res => setActual(res.data))
      .catch(err => {
        setError(err?.response?.data?.error || 'Failed to load maintenance actual')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !actual) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <PageHeader
            title={<Typography variant='h4'>Maintenance Actual</Typography>}
            subtitle={<Typography sx={{ color: 'text.secondary' }}>Recorded maintenance for one plan date</Typography>}
          />
        </Grid>
        <Grid item xs={12}>
          <Card sx={{ p: 4 }}>
            <Typography color='error' sx={{ mb: 3 }}>{error || 'Maintenance actual not found'}</Typography>
            <Button component={Link} href='/maintenance-actuals/list' variant='contained' startIcon={<Icon icon='tabler:arrow-left' />}>
              Back to List
            </Button>
          </Card>
        </Grid>
      </Grid>
    )
  }

  const planMonthLabel = actual.planMonth ? MONTH_NAMES[actual.planMonth] || actual.planMonth : ''
  const planPeriod = actual.planYear ? `${actual.planYear}${planMonthLabel ? ` ${planMonthLabel}` : ''}` : '—'
  const maintenanceDateLabel = formatDisplayDate(actual.maintenanceDate, '—')

  const createdAtLabel = actual.createdAt
    ? new Date(actual.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
  const unitTitle = [actual.unitCode, actual.unitModel].filter(Boolean).join(' · ')
  const unitSubtitle = actual.unitDescription || '—'

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
          <Box sx={{ minWidth: 0, '& > .MuiGrid-item': { width: 'auto', maxWidth: '100%', flexBasis: 'auto' } }}>
            <PageHeader
              title={<Typography variant='h4'>{actual.registerNo || 'Maintenance Actual'}</Typography>}
              subtitle={
                <Typography sx={{ color: 'text.secondary' }}>
                  {[actual.unitCode, actual.planTypeName, maintenanceDateLabel].filter(Boolean).join(' · ')}
                </Typography>
              }
            />
          </Box>
          <Box sx={{ display: 'flex', flexShrink: 0, gap: 2 }}>
            <Button
              component={Link}
              href={`/maintenance-actuals/edit/${actual.id}`}
              variant='contained'
              color='primary'
              startIcon={<Icon icon='tabler:edit' />}
            >
              Edit
            </Button>
            <Button component={Link} href='/maintenance-actuals/list' variant='tonal' color='secondary' startIcon={<Icon icon='tabler:arrow-left' />}>
              Back
            </Button>
          </Box>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {actual.planTypeName ? <CustomChip skin='light' color='primary' label={actual.planTypeName} /> : null}
          {actual.planDate ? <CustomChip skin='light' label={`Plan ${actual.planDate}`} /> : null}
          <CustomChip skin='light' label={`Actual ${maintenanceDateLabel}`} />
          {actual.hourMeter != null ? <CustomChip skin='light' label={`HM ${actual.hourMeter}`} /> : null}
          {actual.unitProjectName ? <CustomChip skin='light' color='secondary' label={actual.unitProjectName} /> : null}
        </Box>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, height: '100%' }}>
          <CardHeader
            title='Unit'
            titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
            avatar={
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText'
                }}
              >
                <Icon icon='tabler:truck' fontSize={22} />
              </Box>
            }
          />
          <Divider />
          <CardContent>
            <Typography
              component={actual.unitId ? Link : 'p'}
              href={actual.unitId ? `/units/${actual.unitId}` : undefined}
              variant='h6'
              sx={{
                fontWeight: 600,
                mb: 1,
                color: actual.unitId ? 'primary.main' : 'text.primary',
                textDecoration: 'none',
                '&:hover': actual.unitId ? { textDecoration: 'underline' } : {}
              }}
            >
              {unitTitle || actual.unitCode || '—'}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>{unitSubtitle}</Typography>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <DetailField label='Project' value={actual.unitProjectName} />
              </Grid>
              <Grid item xs={6}>
                <DetailField label='Status'>
                  <CustomChip
                    size='small'
                    skin='light'
                    rounded
                    label={actual.unitStatus || '—'}
                    color={unitStatusColor[actual.unitStatus] || 'secondary'}
                  />
                </DetailField>
              </Grid>
              <Grid item xs={6}>
                <DetailField label='Manufacture' value={actual.unitManufacture} />
              </Grid>
              <Grid item xs={6}>
                <DetailField label='Plant group' value={actual.unitPlantGroup} />
              </Grid>
              <Grid item xs={12}>
                <DetailField label='Plant type' value={actual.unitPlantType} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <CardHeader title='Execution' titleTypographyProps={{ variant: 'h6', fontWeight: 600 }} />
          <Divider />
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4}>
                <StatTile icon='tabler:calendar-event' label='Actual date' value={maintenanceDateLabel} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatTile icon='tabler:clock' label='Time' value={actual.maintenanceTime || '—'} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatTile icon='tabler:gauge' label='Hour meter' value={actual.hourMeter != null ? String(actual.hourMeter) : '—'} />
              </Grid>
            </Grid>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <DetailField label='Plan period' value={planPeriod} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label='Plan date' value={actual.planDate} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label='Status'>
                  <CustomChip
                    size='small'
                    skin='light'
                    rounded
                    label={ACTUAL_STATUS[actual.status]?.label || actual.status || '—'}
                    color={ACTUAL_STATUS[actual.status]?.color || 'secondary'}
                  />
                </DetailField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label='QC status'>
                  <CustomChip
                    size='small'
                    skin='light'
                    rounded
                    label={QC_STATUS[actual.qcStatus]?.label || 'Not checked'}
                    color={QC_STATUS[actual.qcStatus]?.color || 'secondary'}
                  />
                </DetailField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label='PIC' value={actual.picName} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label='Mechanics' value={actual.mechanics} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label='Recorded by' value={actual.createdByUsername} />
              </Grid>
              <Grid item xs={12}>
                <DetailField label='Recorded at' value={createdAtLabel} />
              </Grid>
            </Grid>
            <Divider sx={{ my: 4 }} />
            <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 600 }}>Remarks</Typography>
            <Paper variant='outlined' sx={{ p: 3, bgcolor: 'action.hover', borderColor: 'divider' }}>
              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{actual.remarks || 'No remarks.'}</Typography>
            </Paper>
            <Divider sx={{ my: 4 }} />
            <EntityAttachmentsSection
              entityType='MAINTENANCE_ACTUAL'
              entityId={actual.id}
              canUpload={canManageAttachments}
              canDelete={canManageAttachments}
              imagesOnly
              title='Maintenance attachments'
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <ActualFailureSummary
          fleetUnitId={actual.fleetUnitId}
          actualId={actual.id}
          canManageAttachments={canManageAttachments}
        />
      </Grid>
    </Grid>
  )
}

MaintenanceActualView.acl = {
  subject: 'maintenance-actual',
  action: 'read'
}

export default MaintenanceActualView
