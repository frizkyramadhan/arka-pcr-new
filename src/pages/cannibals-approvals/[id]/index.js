/**
 * Halaman review & approval Cannibal BA — scoped ke satu id_ba_approval.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'

import arkaApi from 'src/utils/arka-api'
import { canEditCannibalLogistic } from 'src/utils/cannibal-access'
import {
  isLegacyLogisticStatementSave,
  isLegacyPlantStatementSave,
  showLogisticStatementUpdateAction,
  showPlantStatementUpdateAction
} from 'src/utils/cannibal-legacy-statement'
import { showLegacyApprovalSeedAction, getLegacyApprovalSeedConfirmDialog } from 'src/utils/cannibal-legacy-approval'

import useCannibalApprovalActions from 'src/hooks/useCannibalApprovalActions'
import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'

import CannibalApprovalDetailInfo from 'src/views/pcr/cannibal/CannibalApprovalDetailInfo'
import CannibalApprovalDetailSummary from 'src/views/pcr/cannibal/CannibalApprovalDetailSummary'
import CannibalApprovalTimeline from 'src/views/pcr/cannibal/CannibalApprovalTimeline'
import CannibalDetailHeaderActions from 'src/views/pcr/cannibal/CannibalDetailHeaderActions'
import CannibalDialog from 'src/views/pcr/cannibal/CannibalDialog'
import CannibalJustificationDisplay from 'src/views/pcr/cannibal/CannibalJustificationDisplay'
import CannibalLogisticDialog from 'src/views/pcr/cannibal/CannibalLogisticDialog'

const CannibalApprovalDetailPage = () => {
  const router = useRouter()
  const theme = useTheme()
  const auth = useAuth()
  const { can, roles } = useCan()
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'))
  const { id: idBaApproval } = router.query

  const canEditPlant = can('cannibals.update')
  const canEditLogistic = canEditCannibalLogistic({ can, roles })

  const [ba, setBa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workflowHeight, setWorkflowHeight] = useState(null)
  const [plantDialogOpen, setPlantDialogOpen] = useState(false)
  const [logisticDialogOpen, setLogisticDialogOpen] = useState(false)
  const [seedApprovalDialogOpen, setSeedApprovalDialogOpen] = useState(false)
  const [seedApprovalLoading, setSeedApprovalLoading] = useState(false)
  const transferCardRef = useRef(null)

  const fetchDetail = useCallback(async () => {
    if (!idBaApproval) return

    setLoading(true)
    try {
      const { data } = await arkaApi.get(`/approvals/${idBaApproval}`)
      setBa(data)
    } catch {
      toast.error('Failed to load cannibal BA for approval')
      router.replace('/cannibals-approvals')
    } finally {
      setLoading(false)
    }
  }, [idBaApproval, router])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const measureWorkflowHeight = useCallback(() => {
    const transferEl = transferCardRef.current
    if (!transferEl) return

    setWorkflowHeight(transferEl.offsetHeight)
  }, [])

  useEffect(() => {
    if (loading || !ba) return

    measureWorkflowHeight()

    const ro = new ResizeObserver(measureWorkflowHeight)
    if (transferCardRef.current) ro.observe(transferCardRef.current)

    return () => ro.disconnect()
  }, [loading, ba, measureWorkflowHeight])

  const {
    loading: approvalLoading,
    handleApprove,
    handleReject,
    handleRevoke
  } = useCannibalApprovalActions({ onSuccess: fetchDetail })

  const handlePlantSave = async payload => {
    const legacySave = isLegacyPlantStatementSave(ba)

    try {
      if (legacySave) {
        await arkaApi.put(`/cannibals/${ba.idBa}/plant-statement`, payload)
      } else {
        await arkaApi.put(`/cannibals/${ba.idBa}`, payload)
      }
      toast.success('Plant section saved')
      setPlantDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleLogisticSave = async payload => {
    const legacySave = isLegacyLogisticStatementSave(ba)

    try {
      await arkaApi.put(`/cannibals/${ba.idBa}/logistic`, payload)
      toast.success(legacySave ? 'Logistic statement saved' : 'Logistic statement confirmed — continue with Record & Documentation')
      setLogisticDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleSeedLegacyApproval = async () => {
    if (!ba?.idBa) return

    setSeedApprovalLoading(true)
    try {
      await arkaApi.post(`/cannibals/${ba.idBa}/seed-approval`)
      toast.success('Approval chain initialized (PS → PD, all PENDING)')
      setSeedApprovalDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Failed to initialize approval chain')
    } finally {
      setSeedApprovalLoading(false)
    }
  }

  if (!idBaApproval) return null

  const inApprovalFlow = ['SUBMITTED', 'OPEN'].includes(ba?.statusBa)
  const showPlantStatementAction = showPlantStatementUpdateAction(ba, canEditPlant)
  const showLogisticStatementAction = showLogisticStatementUpdateAction(ba, canEditLogistic)
  const legacyLogisticStatementSave = isLegacyLogisticStatementSave(ba)
  const legacyApprovalSeedAction = showLegacyApprovalSeedAction(ba, roles)
  const legacyApprovalSeedDialog = getLegacyApprovalSeedConfirmDialog(ba?.noBa)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant='tonal'
              color='secondary'
              startIcon={<Icon icon='tabler:arrow-left' />}
              onClick={() => router.push('/cannibals-approvals')}
            >
              Back to Queue
            </Button>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Cannibal BA Review
              {!loading && ba?.noBa ? ` · ${ba.noBa}` : ''}
            </Typography>
          </Box>
          {!loading && ba ? (
            <CannibalDetailHeaderActions
              baId={ba.idBa}
              ba={ba}
              canEditPlant={canEditPlant}
              canEditLogistic={canEditLogistic}
              showPlantStatementAction={showPlantStatementAction}
              showLogisticStatementAction={showLogisticStatementAction}
              showLegacyApprovalSeedAction={legacyApprovalSeedAction}
              onEditPlant={() => setPlantDialogOpen(true)}
              onEditLogistic={() => setLogisticDialogOpen(true)}
              onSeedLegacyApproval={() => setSeedApprovalDialogOpen(true)}
            />
          ) : null}
        </Box>
      </Grid>

      <Grid item xs={12}>
        {loading ? <Skeleton variant='rounded' height={160} /> : <CannibalApprovalDetailSummary ba={ba} />}
      </Grid>

      <Grid item xs={12} lg={8}>
        <CannibalApprovalDetailInfo ba={ba} loading={loading} transferCardRef={transferCardRef} />
      </Grid>

      <Grid item xs={12} lg={4}>
        {loading ? (
          <Skeleton variant='rounded' height={520} />
        ) : (
          <CannibalApprovalTimeline
            ba={ba}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevoke={handleRevoke}
            actionLoading={approvalLoading}
            showActions={inApprovalFlow}
            scrollable={isLgUp && Boolean(workflowHeight)}
            maxHeight={isLgUp ? workflowHeight : undefined}
          />
        )}
      </Grid>

      <Grid item xs={12}>
        {loading ? (
          <Skeleton variant='rounded' height={360} />
        ) : ba ? (
          <CannibalJustificationDisplay ba={ba} />
        ) : null}
      </Grid>

      <CannibalDialog
        open={plantDialogOpen}
        onClose={() => setPlantDialogOpen(false)}
        onSave={handlePlantSave}
        initialData={ba}
        defaultProjectCode={auth.user?.projectCodes?.[0] ?? auth.user?.projectCode}
      />

      <CannibalLogisticDialog
        open={logisticDialogOpen}
        onClose={() => setLogisticDialogOpen(false)}
        onSave={handleLogisticSave}
        initialData={ba}
        legacyMode={legacyLogisticStatementSave}
      />

      <DeleteConfirmDialog
        open={seedApprovalDialogOpen}
        title={legacyApprovalSeedDialog.title}
        message={legacyApprovalSeedDialog.message}
        confirmLabel={legacyApprovalSeedDialog.confirmLabel}
        confirmColor='warning'
        loading={seedApprovalLoading}
        onClose={() => setSeedApprovalDialogOpen(false)}
        onConfirm={handleSeedLegacyApproval}
      />
    </Grid>
  )
}

CannibalApprovalDetailPage.authGuard = true

export default CannibalApprovalDetailPage
