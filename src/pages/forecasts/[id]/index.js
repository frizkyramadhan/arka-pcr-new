/**
 * Halaman detail PCR Forecast — ringkasan, detail, approval workflow.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/router'
import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import toast from 'react-hot-toast'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import Icon from 'src/@core/components/icon'

import arkaApi from 'src/utils/arka-api'

import useCan from 'src/hooks/useCan'
import useForecastRowHandlers from 'src/hooks/useForecastRowHandlers'

import SubmitBaPcrDialog from 'src/views/pcr/forecasts/SubmitBaPcrDialog'
import ConvertForecastDialog from 'src/views/pcr/forecasts/ConvertForecastDialog'
import ForecastApprovalTimeline from 'src/views/pcr/forecasts/ForecastApprovalTimeline'
import ForecastDetailInfo from 'src/views/pcr/forecasts/ForecastDetailInfo'
import ForecastDetailSummary from 'src/views/pcr/forecasts/ForecastDetailSummary'
import ForecastEditDialog from 'src/views/pcr/forecasts/ForecastEditDialog'
import { canConvertForecastRow, canDeleteForecastRow } from 'src/utils/forecast-row-auth'

const ForecastDetailPage = () => {
  const router = useRouter()
  const theme = useTheme()
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'))
  const { id, from, fleetId: queryFleetId } = router.query
  const { can } = useCan()

  const canEdit = can('forecasts.update')
  const canDelete = can('forecasts.delete')
  const canSubmit = can('forecasts.submit')

  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [workflowHeight, setWorkflowHeight] = useState(null)
  const unitCardRef = useRef(null)
  const baPcrCardRef = useRef(null)

  const backHref = useMemo(() => {
    if (from === 'approvals') return '/approvals'

    const unitId = queryFleetId ?? forecast?.fleetUnitId
    if (unitId) return `/units/${unitId}?tab=forecast`

    return '/forecasts'
  }, [from, queryFleetId, forecast?.fleetUnitId])

  const fetchDetail = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const { data } = await arkaApi.get(`/forecasts/${id}`)
      setForecast(data)
    } catch {
      toast.error('Failed to load forecast detail')
      router.replace(backHref)
    } finally {
      setLoading(false)
    }
  }, [id, backHref, router])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const measureWorkflowHeight = useCallback(() => {
    const unitEl = unitCardRef.current
    const baEl = baPcrCardRef.current
    if (!unitEl || !baEl) return

    const gap = 32
    setWorkflowHeight(unitEl.offsetHeight + baEl.offsetHeight + gap)
  }, [])

  useEffect(() => {
    if (loading || !forecast) return

    measureWorkflowHeight()

    const ro = new ResizeObserver(measureWorkflowHeight)
    if (unitCardRef.current) ro.observe(unitCardRef.current)
    if (baPcrCardRef.current) ro.observe(baPcrCardRef.current)

    return () => ro.disconnect()
  }, [loading, forecast, measureWorkflowHeight])

  const fleetId = forecast?.fleetUnitId ?? queryFleetId

  const {
    userId: sessionUserId,
    convertTarget,
    setConvertTarget,
    submitBaTarget,
    setSubmitBaTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleRowAction,
    handleDeleteConfirm,
    handleConvertSuccess
  } = useForecastRowHandlers({
    onReload: fetchDetail,
    fleetId
  })

  const runRowAction = async action => {
    await handleRowAction(action, forecast)
    if (action === 'delete') return
    fetchDetail()
  }

  const canConvert = forecast ? canConvertForecastRow(forecast, sessionUserId, can) : false
  const editable = forecast?.status === 'OPEN' && ['PENDING', 'REJECTED'].includes(forecast?.baPcrStatus)
  const compLabel = forecast?.compDesc ?? forecast?.commod?.comp?.compDesc ?? ''

  if (!id) return null

  return (
    <Grid container spacing={6}>
      {/* Toolbar */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:arrow-left' />}
            onClick={() => router.push(backHref)}
          >
            Back
          </Button>
          {!loading && forecast ? (
            <Button
              variant='tonal'
              startIcon={<Icon icon='tabler:printer' />}
              component={Link}
              href={`/forecasts/${id}/print`}
              target='_blank'
            >
              Print BA PCR
            </Button>
          ) : null}
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Forecast #{id}
          </Typography>
        </Box>
      </Grid>

      {/* Summary hero */}
      <Grid item xs={12}>
        {loading ? (
          <Card>
            <CardContent sx={{ p: 5 }}>
              <Skeleton variant='text' width='40%' height={40} />
              <Skeleton variant='text' width='60%' />
              <Skeleton variant='rounded' height={12} sx={{ mt: 4, mb: 4 }} />
              <Grid container spacing={3}>
                {[1, 2, 3, 4].map(key => (
                  <Grid item xs={6} sm={3} key={key}>
                    <Skeleton variant='rounded' height={88} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        ) : (
          <ForecastDetailSummary forecast={forecast} />
        )}
      </Grid>

      {/* Actions */}
      {!loading && forecast ? (
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ py: 3, px: { xs: 4, sm: 5 }, '&:last-child': { pb: 3 } }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                Actions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {canSubmit && forecast.status === 'OPEN' && ['PENDING', 'REJECTED'].includes(forecast.baPcrStatus) ? (
                  <Button
                    variant='contained'
                    color='primary'
                    startIcon={<Icon icon='tabler:send' />}
                    onClick={() => runRowAction('submit-ba')}
                  >
                    Submit BA PCR
                  </Button>
                ) : null}
                {canConvert ? (
                  <Button
                    variant='contained'
                    color='success'
                    startIcon={<Icon icon='tabler:arrow-right' />}
                    onClick={() => setConvertTarget(forecast)}
                  >
                    Proceed to Replacement
                  </Button>
                ) : null}
                {forecast.idRep && !canConvert ? (
                  <Button
                    variant='tonal'
                    startIcon={<Icon icon='tabler:tool' />}
                    onClick={() => runRowAction('view-wo')}
                  >
                    View Replacement
                  </Button>
                ) : null}

                {canEdit && editable ? (
                  <>
                    <Divider orientation='vertical' flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />
                    <Button variant='tonal' startIcon={<Icon icon='tabler:edit' />} onClick={() => setEditOpen(true)}>
                      Edit
                    </Button>
                    <Tooltip title='Re-read live HM, life %, SOS, and price from the database. Only available before BA PCR is submitted or while rejected.'>
                      <Button
                        variant='tonal'
                        color='info'
                        startIcon={<Icon icon='tabler:refresh' />}
                        onClick={() => runRowAction('refresh')}
                      >
                        Refresh Metrics
                      </Button>
                    </Tooltip>
                  </>
                ) : null}

                {canDelete && canDeleteForecastRow(forecast) ? (
                  <Button
                    variant='tonal'
                    color='error'
                    startIcon={<Icon icon='tabler:trash' />}
                    onClick={() => setDeleteTarget(forecast)}
                  >
                    Delete
                  </Button>
                ) : null}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : null}

      {/* Detail + Approval */}
      <Grid item xs={12} lg={8}>
        {loading ? (
          <Skeleton variant='rounded' height={400} />
        ) : (
          <ForecastDetailInfo forecast={forecast} unitCardRef={unitCardRef} baPcrCardRef={baPcrCardRef} />
        )}
      </Grid>

      <Grid item xs={12} lg={4}>
        {loading ? (
          <Skeleton variant='rounded' height={520} />
        ) : (
          <ForecastApprovalTimeline
            forecast={forecast}
            showActions={false}
            scrollable={isLgUp && Boolean(workflowHeight)}
            maxHeight={isLgUp ? workflowHeight : undefined}
          />
        )}
      </Grid>

      <ForecastEditDialog
        open={editOpen}
        forecast={forecast}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchDetail}
      />

      <ConvertForecastDialog
        open={Boolean(convertTarget)}
        forecast={convertTarget}
        onClose={() => setConvertTarget(null)}
        onSuccess={data => {
          handleConvertSuccess(data)
          fetchDetail()
        }}
      />

      <SubmitBaPcrDialog
        open={Boolean(submitBaTarget)}
        forecast={submitBaTarget}
        onClose={() => setSubmitBaTarget(null)}
        onSuccess={() => {
          toast.success('BA PCR submitted')
          fetchDetail()
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Forecast?'
        message={
          deleteTarget ? `Delete forecast #${deleteTarget.idForecast} for ${deleteTarget.unitNo} — ${compLabel}?` : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          await handleDeleteConfirm()
          router.push(backHref)
        }}
      />
    </Grid>
  )
}

ForecastDetailPage.authGuard = true

export default ForecastDetailPage
