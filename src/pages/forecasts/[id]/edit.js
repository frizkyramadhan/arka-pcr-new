/**
 * Edit PCR Forecast — full page (not a modal). OPEN + PENDING/REJECTED only.
 */
import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'

import arkaApi from 'src/utils/arka-api'
import { forecastDetailPath } from 'src/utils/forecast-form-href'

import useCan from 'src/hooks/useCan'

import ForecastEditForm from 'src/views/pcr/forecasts/ForecastEditForm'

const ForecastEditPage = () => {
  const router = useRouter()
  const { id, from, fleetId: queryFleetId } = router.query
  const { can } = useCan()
  const canEdit = can('forecasts.update')

  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)

  const nav = { from, fleetId: queryFleetId }
  const detailHref = id ? forecastDetailPath(id, nav) : '/forecasts'

  const editable = forecast?.status === 'OPEN' && ['PENDING', 'REJECTED'].includes(forecast?.baPcrStatus)

  const fetchDetail = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const { data } = await arkaApi.get(`/forecasts/${id}`)
      setForecast(data)
    } catch {
      toast.error('Failed to load forecast')
      router.replace('/forecasts')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    if (!canEdit) router.replace(detailHref)
  }, [canEdit, detailHref, router])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  useEffect(() => {
    if (loading || !forecast) return
    if (!editable) {
      toast.error('This forecast can no longer be edited')
      router.replace(detailHref)
    }
  }, [detailHref, editable, forecast, loading, router])

  if (!canEdit || !id) return null

  const handleSaved = () => {
    router.push(detailHref)
  }

  return (
    <Grid container spacing={6} sx={{ pb: 8 }}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:arrow-left' />}
            component={Link}
            href={detailHref}
            sx={{ flexShrink: 0 }}
          >
            Back
          </Button>
        </Box>
        <PageHeader
          title={<Typography variant='h4'>Edit PCR Forecast</Typography>}
          subtitle={
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Forecast #{id}
              {forecast?.unitNo ? ` · ${forecast.unitNo}` : ''}
              {forecast?.compDesc ? ` — ${forecast.compDesc}` : ''}
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        {loading || !forecast || !editable ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ForecastEditForm forecast={forecast} onCancel={() => router.push(detailHref)} onSuccess={handleSaved} />
        )}
      </Grid>
    </Grid>
  )
}

ForecastEditPage.authGuard = true

export default ForecastEditPage
