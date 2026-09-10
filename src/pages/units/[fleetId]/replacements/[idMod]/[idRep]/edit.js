/**
 * Edit Replacement — full page (same form as former modal).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

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
import { canExecuteReplacementRow } from 'src/utils/replacement-row-auth'

import useCan from 'src/hooks/useCan'

import ReplacementForm from 'src/views/pcr/replacements/ReplacementForm'

const ReplacementEditPage = () => {
  const router = useRouter()
  const { fleetId, idMod, idRep, from } = router.query
  const { can, canAny } = useCan()

  const canEditOpen = can('replacements.update')
  const canEditClosed = canAny(['system.admin', 'replacements.edit.close'])

  const [replacement, setReplacement] = useState(null)
  const [unit, setUnit] = useState(null)
  const [loading, setLoading] = useState(true)

  const backHref = useMemo(() => {
    if (from === 'list' && fleetId) return `/units/${fleetId}/replacements`

    if (fleetId && idMod) return `/units/${fleetId}/replacements/${idMod}`

    return fleetId ? `/units/${fleetId}?tab=actual` : '/units'
  }, [fleetId, from, idMod])

  const fetchData = useCallback(async () => {
    if (!fleetId || !idMod || !idRep) return

    setLoading(true)
    try {
      const [repRes, unitRes] = await Promise.all([
        arkaApi.get(`/replacements/${idRep}`),
        arkaApi.get(`/fleet/units/${fleetId}`)
      ])

      const row = repRes.data
      if (String(row.fleetUnitId) !== String(fleetId) || String(row.idMod) !== String(idMod)) {
        toast.error('Replacement does not match this unit/component')
        router.replace(backHref)

        return
      }

      setReplacement(row)
      setUnit(unitRes.data)
    } catch {
      toast.error('Failed to load replacement')
      router.replace(backHref)
    } finally {
      setLoading(false)
    }
  }, [backHref, fleetId, idMod, idRep, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const editable = useMemo(() => {
    if (!replacement) return false
    if (replacement.woStatus === 'CLOSE') return canEditClosed

    return canEditOpen && canExecuteReplacementRow(replacement)
  }, [canEditClosed, canEditOpen, replacement])

  useEffect(() => {
    if (loading || !replacement) return
    if (!editable) {
      toast.error('You cannot edit this work order')
      router.replace(backHref)
    }
  }, [backHref, editable, loading, replacement, router])

  if (!fleetId || !idMod || !idRep) return null

  const handleSaved = () => {
    router.push(backHref)
  }

  const fleetModelId = unit?.model_id ?? unit?.modelId ?? null
  const latestHmUnit = unit?.latest_hm_unit ?? unit?.latestHmUnit ?? null
  const compDesc = replacement?.commod?.comp?.compDesc
  const unitNo = unit?.unit_no ?? unit?.unitNo

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
          title={<Typography variant='h4'>Edit Replacement</Typography>}
          subtitle={
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              WO #{replacement?.woNo ?? idRep}
              {unitNo ? ` · ${unitNo}` : ''}
              {compDesc ? ` — ${compDesc}` : ''}
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        {loading || !replacement || !editable ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ReplacementForm
            replacement={replacement}
            fleetModelId={fleetModelId}
            latestHmUnit={latestHmUnit}
            closedEditAllowed={canEditClosed}
            onCancel={() => router.push(backHref)}
            onSuccess={handleSaved}
          />
        )}
      </Grid>
    </Grid>
  )
}

ReplacementEditPage.authGuard = true
ReplacementEditPage.pageTitle = 'Edit Replacement'

export default ReplacementEditPage
