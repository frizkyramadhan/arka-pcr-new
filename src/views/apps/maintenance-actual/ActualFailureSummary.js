/**
 * Findings on the view page — recorded on this actual and open findings counted here.
 */
import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'
import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'
import EntityAttachmentsSection from 'src/views/fms/EntityAttachmentsSection'

const SEVERITY_COLOR = { CRITICAL: 'error', MAJOR: 'warning', MINOR: 'info' }

const codeLine = (code, name) => [code, name].filter(Boolean).join(' · ')

const failureCodes = row =>
  [codeLine(row.componentCode, row.componentName), codeLine(row.subComponentCode, row.subComponentName), codeLine(row.damageCode, row.damageName)]
    .filter(Boolean)
    .join(' · ')

const FailureItem = ({ row, badge, canManageAttachments }) => (
  <Box sx={{ py: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <CustomChip size='small' skin='light' color={SEVERITY_COLOR[row.severity] || 'secondary'} label={row.severity} />
        {badge ? (
          <Typography variant='caption' color='text.secondary'>{badge}</Typography>
        ) : null}
      </Box>
      <Typography variant='caption' color='text.secondary'>
        {row.closureDate ? `Closed ${formatDisplayDate(row.closureDate, '—')}` : 'Open'}
      </Typography>
    </Box>
    <Typography variant='body1' sx={{ fontWeight: 600, mb: 2 }}>{row.description}</Typography>
    {failureCodes(row) ? (
      <Box sx={{ mb: 2, p: 2.5, borderRadius: 1, bgcolor: 'action.hover' }}>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
          Failure code
        </Typography>
        <Typography variant='body2'>{failureCodes(row)}</Typography>
      </Box>
    ) : null}
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Typography variant='caption' color='text.secondary'>Finding date</Typography>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>{formatDisplayDate(row.occurredAt, '—')}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography variant='caption' color='text.secondary'>PIC</Typography>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>{row.picName || '—'}</Typography>
      </Grid>
    </Grid>
    <Box sx={{ mt: 3 }}>
      <EntityAttachmentsSection
        entityType='MAINTENANCE_FAILURE'
        entityId={row.id}
        canUpload={canManageAttachments}
        canDelete={canManageAttachments}
        imagesOnly
        title='Finding attachments'
      />
    </Box>
  </Box>
)

const ActualFailureSummary = ({ fleetUnitId, actualId, canManageAttachments = false }) => {
  const [recorded, setRecorded] = useState([])
  const [followUps, setFollowUps] = useState([])

  useEffect(() => {
    if (!fleetUnitId || !actualId) return
    let cancelled = false
    arkaApi
      .get('/maintenance-failures', { params: { fleetUnitId: String(fleetUnitId), actualId } })
      .then(res => {
        if (cancelled) return
        setRecorded(res.data?.recordedHere || [])
        setFollowUps((res.data?.openFailures || []).filter(row => row.countedOnThisActual))
      })
      .catch(() => {
        if (!cancelled) {
          setRecorded([])
          setFollowUps([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [actualId, fleetUnitId])

  const total = useMemo(() => recorded.length + followUps.length, [followUps.length, recorded.length])

  if (!total) return null

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <CardHeader
        title='Findings'
        subheader={`${total} linked to this actual`}
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <Divider />
      <CardContent sx={{ pt: 0, pb: 2 }}>
        {recorded.map((row, index) => (
          <Box key={row.id}>
            {index > 0 ? <Divider /> : null}
            <FailureItem row={row} badge='Recorded on this actual' canManageAttachments={canManageAttachments} />
          </Box>
        ))}
        {followUps.map((row, index) => (
          <Box key={row.id}>
            {index > 0 || recorded.length ? <Divider /> : null}
            <FailureItem row={row} badge='Open · counted on save' canManageAttachments={canManageAttachments} />
          </Box>
        ))}
      </CardContent>
    </Card>
  )
}

export default ActualFailureSummary
