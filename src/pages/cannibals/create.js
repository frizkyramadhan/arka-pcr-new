/**
 * Create Cannibal BA — full page plant form (not a modal).
 */
import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'

import arkaApi from 'src/utils/arka-api'
import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'

import CannibalPlantForm from 'src/views/pcr/cannibal/CannibalPlantForm'

const CannibalCreatePage = () => {
  const router = useRouter()
  const auth = useAuth()
  const { can } = useCan()
  const [saving, setSaving] = useState(false)
  const canCreate = can('cannibals.create')

  useEffect(() => {
    if (!canCreate) router.replace('/cannibals')
  }, [canCreate, router])

  if (!canCreate) return null

  const handleSave = async payload => {
    setSaving(true)
    try {
      const { data } = await arkaApi.post('/cannibals', payload)
      toast.success('BA created')
      router.push(data?.idBa ? `/cannibals/${data.idBa}` : '/cannibals')
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Failed to create BA')
    } finally {
      setSaving(false)
    }
  }

  const backButton = (
    <Button
      variant='tonal'
      color='secondary'
      startIcon={<Icon icon='tabler:arrow-left' />}
      component={Link}
      href='/cannibals'
      sx={{ flexShrink: 0 }}
      disabled={saving}
    >
      Back
    </Button>
  )

  return (
    <Grid container spacing={6} sx={{ pb: 8 }}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          {backButton}
        </Box>
        <PageHeader
          title={<Typography variant='h4'>Create Cannibal BA</Typography>}
          subtitle={
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              One BA per component — REMOVE from source unit and INSTALL to target unit.
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <CannibalPlantForm
          defaultProjectCode={auth.user?.projectCodes?.[0] ?? auth.user?.projectCode ?? '000H'}
          onSave={handleSave}
          onCancel={() => router.push('/cannibals')}
          submitLabel='Create BA'
        />
      </Grid>
    </Grid>
  )
}

CannibalCreatePage.authGuard = true

export default CannibalCreatePage
