/**
 * Unit detail — compact info (fleet_equipment_cache) + tabbed PCR / inspection data.
 */
import { useEffect, useState } from 'react'

import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'

import arkaApi from 'src/utils/arka-api'

import EquipmentStatusChip from 'src/views/pcr/units/EquipmentStatusChip'
import UnitDetailTabs from 'src/views/pcr/units/detail/UnitDetailTabs'
import UnitInfoCompact from 'src/views/pcr/units/detail/UnitInfoCompact'

const UnitDetailPage = () => {
  const router = useRouter()
  const { fleetId } = router.query

  const [unit, setUnit] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fleetId) return

    let cancelled = false
    const controller = new AbortController()

    const loadUnit = async () => {
      setLoading(true)

      try {
        const { data } = await arkaApi.get(`/fleet/units/${fleetId}`, { signal: controller.signal })
        if (!cancelled) setUnit(data)
      } catch (error) {
        if (controller.signal.aborted || error?.code === 'ERR_CANCELED') return

        if (!cancelled) {
          if (error.response?.status === 404) {
            toast.error('Equipment not found in cache. Sync units from the Units page.')
            router.replace('/units')
          } else {
            toast.error('Failed to load unit detail')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUnit()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [fleetId, router])

  if (!fleetId) {
    return null
  }

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:arrow-left' />}
            onClick={() => router.push('/units')}
            sx={{ mt: 0.5 }}
          >
            Back
          </Button>
          <PageHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant='h5' sx={{ fontWeight: 600 }}>
                  {unit?.unit_no ?? 'Unit Detail'}
                </Typography>
                {unit?.unitstatus ? <EquipmentStatusChip status={unit.unitstatus} /> : null}
              </Box>
            }
            subtitle={
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {unit?.description ?? (loading ? 'Loading unit information…' : '—')}
              </Typography>
            }
          />
        </Box>
      </Grid>

      <Grid item xs={12}>
        <UnitInfoCompact unit={unit} loading={loading} />
      </Grid>

      <Grid item xs={12}>
        <UnitDetailTabs fleetId={fleetId} unit={unit} />
      </Grid>
    </Grid>
  )
}

UnitDetailPage.authGuard = true

export default UnitDetailPage
