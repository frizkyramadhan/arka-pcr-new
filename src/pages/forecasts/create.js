/**
 * Create PCR Forecast — full page (not a modal).
 */
import { useEffect, useMemo, useState } from 'react'

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
import { forecastDetailPath, safeInternalPath } from 'src/utils/forecast-form-href'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

import useCan from 'src/hooks/useCan'

import ForecastCreateForm from 'src/views/pcr/forecasts/ForecastCreateForm'

const parsePositiveInt = value => {
  const n = Number(value)

  return Number.isFinite(n) && n > 0 ? n : null
}

const ForecastCreatePage = () => {
  const router = useRouter()
  const { can } = useCan()
  const canCreate = can('forecasts.create')

  const [equipments, setEquipments] = useState([])
  const [unit, setUnit] = useState(null)
  const [loading, setLoading] = useState(true)

  const fleetUnitId = parsePositiveInt(router.query.fleetUnitId)
  const presetIdMod = parsePositiveInt(router.query.idMod)
  const idRep = parsePositiveInt(router.query.idRep)
  const backHref = safeInternalPath(router.query.from, '/forecasts')

  useEffect(() => {
    if (!canCreate) router.replace('/forecasts')
  }, [canCreate, router])

  useEffect(() => {
    if (!router.isReady || !canCreate) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        if (fleetUnitId) {
          const { data } = await arkaApi.get(`/fleet/units/${fleetUnitId}`)
          if (!cancelled) setUnit(data)
        } else {
          const { data } = await arkaApi.get('/fleet/units')
          if (!cancelled) setEquipments(unwrapListPayload(data))
        }
      } catch {
        if (!cancelled) {
          toast.error(fleetUnitId ? 'Failed to load unit' : 'Failed to load equipment list')
          router.replace(backHref)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [backHref, canCreate, fleetUnitId, router, router.isReady])

  const subtitle = useMemo(() => {
    if (unit?.unit_no) {
      return `${unit.unit_no}${unit.model ? ` — ${unit.model}` : ''} · plan component replacement and BA PCR chain`
    }

    return 'Plan a component replacement and BA PCR approval chain'
  }, [unit])

  if (!canCreate) return null

  const handleSave = async payload => {
    const body = idRep ? { ...payload, idRep } : payload
    const { data } = await arkaApi.post('/forecasts', body, { skipGlobalErrorToast: true })
    toast.success('Forecast created')
    router.push(
      data?.idForecast
        ? forecastDetailPath(data.idForecast, fleetUnitId ? { from: 'unit', fleetId: fleetUnitId } : undefined)
        : backHref
    )
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
            href={backHref}
            sx={{ flexShrink: 0 }}
          >
            Back
          </Button>
        </Box>
        <PageHeader
          title={<Typography variant='h4'>Create PCR Forecast</Typography>}
          subtitle={
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        {loading || !router.isReady ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ForecastCreateForm
            equipments={equipments}
            fleetUnitId={fleetUnitId ?? undefined}
            fleetModelId={unit?.model_id}
            equipmentLabel={
              unit?.unit_no ? `${unit.unit_no}${unit.model ? ` — ${unit.model}` : ''}` : ''
            }
            presetIdMod={presetIdMod ?? undefined}
            onSubmit={handleSave}
            onCancel={() => router.push(backHref)}
          />
        )}
      </Grid>
    </Grid>
  )
}

ForecastCreatePage.authGuard = true

export default ForecastCreatePage
