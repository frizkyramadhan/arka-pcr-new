/**
 * Cannibal BA detail page — read-only workflow view.
 */
import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'

import arkaApi from 'src/utils/arka-api'
import { getCannibalStatusLabel } from 'src/utils/cannibal-workflow'
import { getSingleTransfer } from 'src/utils/cannibal-transfer-form'

import BaStatusChip from 'src/views/pcr/cannibal/BaStatusChip'
import CannibalApprovalTimeline from 'src/views/pcr/cannibal/CannibalApprovalTimeline'
import CannibalComponentCard from 'src/views/pcr/cannibal/CannibalComponentCard'
import CannibalDetailHeaderActions from 'src/views/pcr/cannibal/CannibalDetailHeaderActions'
import CannibalDialog from 'src/views/pcr/cannibal/CannibalDialog'
import CannibalExecutionDialog from 'src/views/pcr/cannibal/CannibalExecutionDialog'
import CannibalJustificationDisplay from 'src/views/pcr/cannibal/CannibalJustificationDisplay'
import CannibalLogisticDialog from 'src/views/pcr/cannibal/CannibalLogisticDialog'
import CannibalPlanningDialog from 'src/views/pcr/cannibal/CannibalPlanningDialog'
import CannibalSectionCard from 'src/views/pcr/cannibal/CannibalSectionCard'
import CannibalTransferDisplay from 'src/views/pcr/cannibal/CannibalTransferDisplay'
import CannibalWorkflowStepper from 'src/views/pcr/cannibal/CannibalWorkflowStepper'
import { SapDocumentChain } from 'src/views/pcr/sap'
import { normalizeDocNumValue } from 'src/views/pcr/sap/sap-document-utils'

import { canEditCannibalLogistic } from 'src/utils/cannibal-access'
import {
  isLegacyLogisticStatementSave,
  isLegacyPlantStatementSave,
  showLogisticStatementUpdateAction,
  showPlantStatementUpdateAction
} from 'src/utils/cannibal-legacy-statement'
import { showLegacyApprovalSeedAction, getLegacyApprovalSeedConfirmDialog } from 'src/utils/cannibal-legacy-approval'
import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'
import useSapWoKanibalStatuses from 'src/hooks/useSapWoKanibalStatuses'

const CannibalDetailPage = () => {
  const router = useRouter()
  const auth = useAuth()
  const { can, roles } = useCan()
  const { id } = router.query

  const canEditPlant = can('cannibals.update')
  const canSubmitPlant = can('cannibals.update')
  const canEditLogistic = canEditCannibalLogistic({ can, roles })
  const canSubmitApproval = can('cannibals.update')
  const canEditExecution = can('cannibals.update')
  const canClose = can('cannibals.update')

  const [ba, setBa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plantDialogOpen, setPlantDialogOpen] = useState(false)
  const [logisticDialogOpen, setLogisticDialogOpen] = useState(false)
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false)
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false)
  const [seedApprovalDialogOpen, setSeedApprovalDialogOpen] = useState(false)
  const [seedApprovalLoading, setSeedApprovalLoading] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const { data } = await arkaApi.get(`/cannibals/${id}`)
      setBa(data)
    } catch {
      toast.error('Failed to load BA detail')
      router.replace('/cannibals')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  useEffect(() => {
    if (!router.isReady || loading || !ba) return
    if (router.query.logistic !== '1' || !canEditLogistic || ba.statusBa !== 'PENDING_LOGISTICS') return

    setLogisticDialogOpen(true)
    const { logistic: _logistic, ...rest } = router.query
    router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
  }, [router, loading, ba, canEditLogistic])

  const showApprovalPanel = ['SUBMITTED', 'OPEN', 'APPROVED', 'REJECTED'].includes(ba?.statusBa)

  const runAction = async (action, successMessage) => {
    if (action === 'submit' && (!ba?.mrNo?.trim() || !ba?.prNo?.trim())) {
      toast.error('MR# and PR# are required before submit for approval')

      return
    }

    try {
      await arkaApi.post(`/cannibals/${id}/${action}`)
      toast.success(successMessage)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? `${action} failed`)
    }
  }

  const handlePlantSave = async payload => {
    const legacySave = isLegacyPlantStatementSave(ba)

    try {
      if (legacySave) {
        await arkaApi.put(`/cannibals/${id}/plant-statement`, payload)
        toast.success('Plant section saved')
      } else {
        await arkaApi.put(`/cannibals/${id}`, payload)
        toast.success('Plant section saved')
      }
      setPlantDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleLogisticSave = async payload => {
    const legacySave = isLegacyLogisticStatementSave(ba)

    try {
      await arkaApi.put(`/cannibals/${id}/logistic`, payload)
      toast.success(legacySave ? 'Logistic statement saved' : 'Logistic statement confirmed — continue with Record & Documentation')
      setLogisticDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleExecutionSave = async payload => {
    try {
      await arkaApi.put(`/cannibals/${id}/execution`, payload)
      toast.success('Documentation saved')
      setExecutionDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handlePlanningSave = async payload => {
    try {
      await arkaApi.put(`/cannibals/${id}/planning`, payload)
      toast.success('Planning section saved')
      setPlanningDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleSetBaReference = async (docType, docNum) => {
    if (!ba?.idAction) {
      toast.error('Planning action is required. Open Planning Section first.')

      return
    }

    try {
      await arkaApi.put(`/cannibals/${id}/planning`, {
        idAction: ba.idAction,
        mrNo: docType === 'mr' ? String(docNum) : ba.mrNo || null,
        prNo: docType === 'pr' ? String(docNum) : ba.prNo || null,
        poNo: docType === 'po' ? String(docNum) : ba.poNo || null
      })
      toast.success(`${docType.toUpperCase()}# set as BA reference`)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Failed to update BA reference')
      throw error
    }
  }

  const handleRemoveBaReference = async docType => {
    if (!ba?.idAction) {
      toast.error('Planning action is required. Open Planning Section first.')

      return
    }

    try {
      await arkaApi.put(`/cannibals/${id}/planning`, {
        idAction: ba.idAction,
        mrNo: docType === 'mr' ? null : ba.mrNo || null,
        prNo: docType === 'pr' ? null : ba.prNo || null,
        poNo: docType === 'po' ? null : ba.poNo || null
      })
      toast.success(`${docType.toUpperCase()}# removed from BA reference`)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Failed to remove BA reference')
      throw error
    }
  }

  const handleSeedLegacyApproval = async () => {
    setSeedApprovalLoading(true)
    try {
      await arkaApi.post(`/cannibals/${id}/seed-approval`)
      toast.success('Approval chain initialized (PS → PD, all PENDING)')
      setSeedApprovalDialogOpen(false)
      fetchDetail()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Failed to initialize approval chain')
    } finally {
      setSeedApprovalLoading(false)
    }
  }

  if (!id) return null

  const plantEditable = ba && ['DRAFT', 'REJECTED'].includes(ba.statusBa)
  const logisticEditable = ba?.statusBa === 'PENDING_LOGISTICS'
  const executionEditable = ba?.statusBa === 'PENDING_DOCUMENT'
  // PENDING_DOCUMENT uses combined Update Documentation dialog (not separate Planning)
  const planningEditable =
    ba && ['PENDING_LOGISTICS', 'SUBMITTED', 'OPEN', 'APPROVED', 'REJECTED'].includes(ba.statusBa)
  const canSetBaReference = canEditPlant

  const transfer = ba ? getSingleTransfer(ba) : null
  const { statuses: sapWoStatuses, loading: sapWoStatusesLoading } = useSapWoKanibalStatuses({
    removeWoNo: transfer?.remove?.woNoKanibal,
    installWoNo: transfer?.install?.woNoKanibal,
    enabled: Boolean(ba)
  })
  const componentTitle = transfer?.remove?.compDesc || transfer?.install?.compDesc || ''

  const removeWo = normalizeDocNumValue(transfer?.remove?.woNoKanibal)
  const installWo = normalizeDocNumValue(transfer?.install?.woNoKanibal)
  const sameCannibalWo = Boolean(removeWo && installWo && removeWo === installWo)
  const chainWoNo = sameCannibalWo ? removeWo : removeWo || installWo || ''
  const chainWoRemove = !sameCannibalWo && removeWo && installWo ? removeWo : ''
  const chainWoInstall = !sameCannibalWo && removeWo && installWo ? installWo : ''
  const showPlantStatementAction = showPlantStatementUpdateAction(ba, canEditPlant)
  const showLogisticStatementAction = showLogisticStatementUpdateAction(ba, canEditLogistic)
  const legacyLogisticStatementSave = isLegacyLogisticStatementSave(ba)
  const legacyApprovalSeedAction = showLegacyApprovalSeedAction(ba, roles)
  const legacyApprovalSeedDialog = getLegacyApprovalSeedConfirmDialog(ba?.noBa)

  const pageTitle = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant='h4' sx={{ fontSize: { xs: '1.25rem', sm: '2.125rem' }, lineHeight: 1.2 }}>
        {ba?.noBa ?? 'Cannibal BA Detail'}
      </Typography>
      {ba ? <BaStatusChip status={ba.statusBa} /> : null}
    </Box>
  )

  const pageSubtitle = (
    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
      {loading ? 'Loading…' : getCannibalStatusLabel(ba?.statusBa)}
      {ba?.projectCode ? ` · Project ${ba.projectCode}` : ''}
    </Typography>
  )

  const headerActions = (showBackOnMobile = false) =>
    !loading ? (
      <CannibalDetailHeaderActions
        baId={id}
        ba={ba}
        canEditPlant={canEditPlant}
        canSubmitPlant={canSubmitPlant}
        canEditLogistic={canEditLogistic}
        canSubmitApproval={canSubmitApproval}
        canEditExecution={canEditExecution}
        canClose={canClose}
        plantEditable={plantEditable}
        logisticEditable={logisticEditable}
        executionEditable={executionEditable}
        planningEditable={planningEditable}
        showPlantStatementAction={showPlantStatementAction}
        showLogisticStatementAction={showLogisticStatementAction}
        showLegacyApprovalSeedAction={legacyApprovalSeedAction}
        includeBackOnMobile={showBackOnMobile}
        onEditPlant={() => setPlantDialogOpen(true)}
        onEditLogistic={() => setLogisticDialogOpen(true)}
        onEditExecution={() => setExecutionDialogOpen(true)}
        onEditPlanning={() => setPlanningDialogOpen(true)}
        onRunAction={runAction}
        onSeedLegacyApproval={() => setSeedApprovalDialogOpen(true)}
      />
    ) : null

  const backButton = (
    <Button
      variant='tonal'
      color='secondary'
      startIcon={<Icon icon='tabler:arrow-left' />}
      component={Link}
      href='/cannibals'
      sx={{ flexShrink: 0 }}
    >
      Back
    </Button>
  )

  return (
    <Grid container spacing={6} sx={{ pb: 8 }}>
      <Grid item xs={12}>
        {/* Desktop: tombol di atas, nomor BA di bawah */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            {backButton}
            {headerActions(false)}
          </Box>
          <PageHeader title={pageTitle} subtitle={pageSubtitle} />
        </Box>

        {/* Mobile: nomor BA di samping tombol bertumpuk */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'nowrap',
            width: '100%'
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <PageHeader title={pageTitle} subtitle={pageSubtitle} />
          </Box>
          {headerActions(true)}
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {loading ? (
              <Skeleton variant='rounded' height={48} sx={{ mb: 2 }} />
            ) : (
              <CannibalWorkflowStepper statusBa={ba?.statusBa} compact />
            )}

            {ba?.statusBa === 'PENDING_LOGISTICS' && !ba?.statementConfirmedBy ? (
              <Alert severity='info' icon={<Icon icon='tabler:info-circle' />} sx={{ mt: 2, py: 0.5 }}>
                Waiting for logistics to complete the statement.
              </Alert>
            ) : null}
            {ba?.statusBa === 'PENDING_DOCUMENT' ? (
              <Alert severity='info' icon={<Icon icon='tabler:info-circle' />} sx={{ mt: 2, py: 0.5 }}>
                Use Update Documentation to fill MR# / PR# (required), WO, and notes, then Submit for Approval.
              </Alert>
            ) : null}
            {ba?.statusBa === 'APPROVED' ? (
              <Alert severity='success' icon={<Icon icon='tabler:circle-check' />} sx={{ mt: 2, py: 0.5 }}>
                BA approved — ready to close.
              </Alert>
            ) : null}
            {ba?.statusBa === 'REJECTED' ? (
              <Alert severity='warning' icon={<Icon icon='tabler:alert-triangle' />} sx={{ mt: 2, py: 0.5 }}>
                BA was rejected — review plant data and resubmit when ready.
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        {!loading && ba ? (
          <SapDocumentChain
            woNo={chainWoNo || undefined}
            woRemoveNo={chainWoRemove || undefined}
            woInstallNo={chainWoInstall || undefined}
            title={`SAP Document Chain — ${ba.noBa}`}
            defaultExpanded={false}
            baReference={{ mrNo: ba.mrNo, prNo: ba.prNo, poNo: ba.poNo }}
            canSetBaReference={canSetBaReference}
            onSetBaReference={handleSetBaReference}
            onRemoveBaReference={handleRemoveBaReference}
          />
        ) : null}
      </Grid>

      <Grid item xs={12} md={4}>
        {loading ? (
          <Skeleton variant='rounded' height={320} />
        ) : (
          <CannibalComponentCard ba={ba} transfer={transfer} componentTitle={componentTitle} />
        )}
      </Grid>

      <Grid item xs={12} md={8}>
        <CannibalSectionCard
          fullHeight
          title='Component Transfer'
          subtitle='REMOVE / INSTALL per unit'
          icon='tabler:arrows-left-right'
          iconColor='primary'
          sx={{ mb: 0 }}
        >
          {loading ? (
            <Skeleton variant='rounded' height={360} />
          ) : ba ? (
            <CannibalTransferDisplay
              transfer={transfer}
              pairs={ba.pairs}
              sapWoStatuses={sapWoStatuses}
              sapWoStatusesLoading={sapWoStatusesLoading}
            />
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>No data</Typography>
          )}
        </CannibalSectionCard>
      </Grid>

      <Grid item xs={12}>
        {ba ? <CannibalJustificationDisplay ba={ba} /> : null}

        {showApprovalPanel ? (
          <Box sx={{ mt: 6 }}>
            <CannibalApprovalTimeline ba={ba} showActions={false} />
          </Box>
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

      <CannibalPlanningDialog open={planningDialogOpen} onClose={() => setPlanningDialogOpen(false)} onSave={handlePlanningSave} initialData={ba} />

      <CannibalExecutionDialog open={executionDialogOpen} onClose={() => setExecutionDialogOpen(false)} onSave={handleExecutionSave} initialData={ba} />

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

CannibalDetailPage.authGuard = true

export default CannibalDetailPage
