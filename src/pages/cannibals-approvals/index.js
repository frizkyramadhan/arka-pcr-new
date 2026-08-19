// ** React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// ** Next Imports
import { useRouter } from 'next/router'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'
import toast from 'react-hot-toast'

// ** Custom Components Imports
import PageHeader from 'src/@core/components/page-header'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { buildCannibalFilterParams, EMPTY_CANNIBAL_FILTERS } from 'src/utils/cannibal-list-filters'
import { CANNIBAL_APPROVAL_LEVEL_LABELS, CANNIBAL_APPROVAL_LEVEL_ORDER } from 'src/utils/approval-registry'
import {
  getLegacyApprovalQueueReviewDialog,
  hasLegacyCannibalApprovalSeedRole,
  isLegacyOpenUnapprovedBa
} from 'src/utils/cannibal-legacy-approval'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'
import useServerDataGrid from 'src/hooks/useServerDataGrid'

// ** View Components
import CannibalTableHeader from 'src/views/pcr/cannibal/CannibalTableHeader'
import { buildCannibalApprovalGridColumns } from 'src/views/pcr/cannibal/cannibalApprovalGridColumns'

const CannibalApprovalsPage = () => {
  const router = useRouter()
  const { can } = useCan()
  const auth = useAuth()
  const roles = auth.user?.roles ?? []

  const [projects, setProjects] = useState([])
  const [filters, setFilters] = useState(EMPTY_CANNIBAL_FILTERS)
  const [legacyWarningRow, setLegacyWarningRow] = useState(null)
  const [legacyInitLoading, setLegacyInitLoading] = useState(false)

  const filterParams = useMemo(() => buildCannibalFilterParams(filters), [filters])

  const { serverGridProps, reload } = useServerDataGrid({
    apiPath: '/approvals',
    filterParams
  })

  useEffect(() => {
    arkaApi
      .get('/fleet/projects')
      .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjects([]))
  }, [])

  const approveLevels = useMemo(
    () => CANNIBAL_APPROVAL_LEVEL_ORDER.filter(level => can(`cannibals.approve.${level}`)),
    [can]
  )

  const canInitLegacyApproval = hasLegacyCannibalApprovalSeedRole(roles)

  const legacyWarningDialog = useMemo(
    () => getLegacyApprovalQueueReviewDialog(legacyWarningRow?.noBa, canInitLegacyApproval),
    [legacyWarningRow?.noBa, canInitLegacyApproval]
  )

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleReview = useCallback(
    row => {
      if (row.queueApprovalId) {
        router.push(`/cannibals-approvals/${row.queueApprovalId}`)

        return
      }

      if (row.needsLegacyApprovalInit || isLegacyOpenUnapprovedBa(row)) {
        setLegacyWarningRow(row)

        return
      }

      toast.error('Approval review tidak tersedia untuk BA ini.')
    },
    [router]
  )

  const handleLegacyInitConfirm = useCallback(async () => {
    if (!legacyWarningRow?.idBa) return

    if (!canInitLegacyApproval) {
      setLegacyWarningRow(null)

      return
    }

    setLegacyInitLoading(true)
    try {
      const { data } = await arkaApi.post(`/cannibals/${legacyWarningRow.idBa}/seed-approval`)
      toast.success('Approval chain initialized (PS → PD, all PENDING)')
      setLegacyWarningRow(null)
      reload()

      const firstPending = data?.approvals?.find(item => item.status === 'PENDING')
      if (firstPending?.idBaApproval) {
        router.push(`/cannibals-approvals/${firstPending.idBaApproval}`)
      }
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Failed to initialize approval chain')
    } finally {
      setLegacyInitLoading(false)
    }
  }, [canInitLegacyApproval, legacyWarningRow, reload, router])

  const columns = useMemo(() => buildCannibalApprovalGridColumns({ onReview: handleReview }), [handleReview])

  const userRolesLabel =
    approveLevels.length > 0
      ? approveLevels.map(level => CANNIBAL_APPROVAL_LEVEL_LABELS[level] ?? level).join(', ')
      : null

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Cannibal Approvals</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              {userRolesLabel
                ? `Cannibal BA awaiting your approval (${userRolesLabel}). Open Review to approve or reject.`
                : 'Cannibal BA awaiting approval. Open Review to approve or reject.'}
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CannibalTableHeader
            filters={filters}
            onFilterChange={handleFilterChange}
            projects={projects}
            showToolbarActions={false}
          />
          <DataGrid
            autoHeight
            columns={columns}
            getRowId={row => row.idBa}
            disableRowSelectionOnClick
            {...serverGridProps}
          />
        </Card>
      </Grid>

      <Dialog
        open={Boolean(legacyWarningRow)}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick' && !legacyInitLoading) setLegacyWarningRow(null)
        }}
        aria-labelledby='legacy-approval-queue-warning-title'
      >
        <DialogTitle id='legacy-approval-queue-warning-title'>{legacyWarningDialog.title}</DialogTitle>
        <DialogContent>
          <Alert severity='warning' sx={{ mb: 3 }}>
            {legacyWarningDialog.alert}
          </Alert>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{legacyWarningDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions className='dialog-actions-dense'>
          <Button onClick={() => setLegacyWarningRow(null)} disabled={legacyInitLoading}>
            {legacyWarningDialog.showInit ? 'Batal' : 'Tutup'}
          </Button>
          {legacyWarningDialog.showInit ? (
            <Button
              variant='contained'
              color='warning'
              onClick={handleLegacyInitConfirm}
              disabled={legacyInitLoading}
            >
              {legacyWarningDialog.confirmLabel}
            </Button>
          ) : (
            <Button variant='tonal' onClick={() => setLegacyWarningRow(null)}>
              {legacyWarningDialog.confirmLabel}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

CannibalApprovalsPage.authGuard = true

export default CannibalApprovalsPage
