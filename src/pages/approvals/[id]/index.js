/**
 * Halaman review & approval BA PCR — scoped to satu id_ba_pcr (bukan seluruh riwayat forecast).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/router'
import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'

import arkaApi from 'src/utils/arka-api'

import useForecastApprovalActions from 'src/hooks/useForecastApprovalActions'

import ForecastApprovalTimeline from 'src/views/pcr/forecasts/ForecastApprovalTimeline'
import ForecastDetailInfo from 'src/views/pcr/forecasts/ForecastDetailInfo'
import ForecastDetailSummary from 'src/views/pcr/forecasts/ForecastDetailSummary'

const ForecastApprovalDetailPage = () => {
  const router = useRouter()
  const theme = useTheme()
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'))
  const { id: idBaPcr } = router.query

  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workflowHeight, setWorkflowHeight] = useState(null)
  const unitCardRef = useRef(null)
  const baPcrCardRef = useRef(null)

  const fetchDetail = useCallback(async () => {
    if (!idBaPcr) return

    setLoading(true)
    try {
      const { data } = await arkaApi.get(`/forecast-approvals/${idBaPcr}`)
      setForecast(data)
    } catch {
      toast.error('Failed to load BA PCR for approval')
      router.replace('/approvals')
    } finally {
      setLoading(false)
    }
  }, [idBaPcr, router])

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

  const { loading: approvalLoading, handleApprove, handleReject, handleRevoke } = useForecastApprovalActions({
    onSuccess: fetchDetail
  })

  if (!idBaPcr) return null

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:arrow-left' />}
            onClick={() => router.push('/approvals')}
          >
            Back to Queue
          </Button>
          {!loading && forecast ? (
            <Button
              variant='tonal'
              startIcon={<Icon icon='tabler:printer' />}
              component={Link}
              href={`/forecasts/${forecast.idForecast}/print`}
              target='_blank'
            >
              Print BA PCR
            </Button>
          ) : null}
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            BA PCR Review
            {!loading && forecast?.noBaPcr ? ` · ${forecast.noBaPcr}` : ''}
          </Typography>
        </Box>
      </Grid>

      <Grid item xs={12}>
        {loading ? (
          <Skeleton variant='rounded' height={280} />
        ) : (
          <ForecastDetailSummary forecast={forecast} />
        )}
      </Grid>

      <Grid item xs={12} lg={8}>
        {loading ? (
          <Skeleton variant='rounded' height={480} />
        ) : (
          <ForecastDetailInfo
            forecast={forecast}
            unitCardRef={unitCardRef}
            baPcrCardRef={baPcrCardRef}
            showBaPcrHistory={false}
          />
        )}
      </Grid>

      <Grid item xs={12} lg={4}>
        {loading ? (
          <Skeleton variant='rounded' height={520} />
        ) : (
          <ForecastApprovalTimeline
            forecast={forecast}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevoke={handleRevoke}
            actionLoading={approvalLoading}
            showBaPcrSelector={false}
            scrollable={isLgUp && Boolean(workflowHeight)}
            maxHeight={isLgUp ? workflowHeight : undefined}
          />
        )}
      </Grid>
    </Grid>
  )
}

ForecastApprovalDetailPage.authGuard = true

export default ForecastApprovalDetailPage
