// ** React Imports

import { useCallback, useEffect, useMemo, useState } from 'react'



// ** Next Imports

// ** MUI Imports

import Card from '@mui/material/Card'

import Grid from '@mui/material/Grid'

import Typography from '@mui/material/Typography'

import { DataGrid } from '@mui/x-data-grid'



// ** Custom Components Imports

import PageHeader from 'src/@core/components/page-header'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'



// ** Utils

import arkaApi from 'src/utils/arka-api'
import { apiPath } from 'src/utils/base-path'

import {

  buildCannibalExportQuery,

  buildCannibalFilterParams,

  EMPTY_CANNIBAL_FILTERS

} from 'src/utils/cannibal-list-filters'
import { getConfirmRequestorDialog, getRejectRequestorConfirmDialog, getSubmitToRequestorDialog } from 'src/utils/cannibal-requestor-dialog'
import { getReopenExpiredDialog } from 'src/utils/cannibal-workflow'



// ** View Components

import CannibalDialog from 'src/views/pcr/cannibal/CannibalDialog'

import CannibalTableHeader from 'src/views/pcr/cannibal/CannibalTableHeader'

import RejectCannibalRequestorDialog from 'src/views/pcr/cannibal/RejectCannibalRequestorDialog'

import { buildCannibalGridColumns } from 'src/views/pcr/cannibal/cannibalGridColumns'



// ** Hooks

import { useAuth } from 'src/hooks/useAuth'

import useCan from 'src/hooks/useCan'

import { canEditCannibalLogistic } from 'src/utils/cannibal-access'

import useCannibalRowHandlers from 'src/hooks/useCannibalRowHandlers'

import useServerDataGrid from 'src/hooks/useServerDataGrid'



const CannibalListPage = () => {

  const auth = useAuth()

  const { can, roles } = useCan()

  const canEdit = can('cannibals.create') || can('cannibals.update')

  const canCreate = can('cannibals.create')

  const canExport = can('exports.cannibal')

  const canSubmitPlant = can('cannibals.update')

  const canCloseBa = can('cannibals.update')

  const canEditExecution = can('cannibals.update')

  const canEditLogistic = canEditCannibalLogistic({ can, roles })

  const canSubmitApproval = can('cannibals.update')

  const canReopen = can('cannibals.reopen')



  const [projects, setProjects] = useState([])

  const [filters, setFilters] = useState(EMPTY_CANNIBAL_FILTERS)



  const filterParams = useMemo(() => buildCannibalFilterParams(filters), [filters])



  const { serverGridProps, reload } = useServerDataGrid({

    apiPath: '/cannibals',

    filterParams

  })



  const {
    editTarget,
    dialogOpen,
    closeDialog,
    deleteTarget,
    deleting,
    closeDeleteDialog,
    handleDeleteConfirm,
    handleRowAction,
    handleSave,
    rejectOpen,
    rejecting,
    rejectConfirmOpen,
    rejectTarget,
    confirmOpen,
    confirming,
    confirmTarget,
    submitRequestorOpen,
    submittingRequestor,
    submitRequestorTarget,
    reopenExpiredOpen,
    reopeningExpired,
    reopenExpiredTarget,
    closeRejectDialog,
    closeRejectConfirmDialog,
    closeConfirmDialog,
    closeSubmitRequestorDialog,
    closeReopenExpiredDialog,
    handleRejectRequestor,
    handleConfirmRequestorProceed,
    handleRejectRequestorProceed,
    handleSubmitToRequestorProceed,
    handleReopenExpiredConfirm
  } = useCannibalRowHandlers({
    onReload: reload
  })

  const submitToRequestorDialog = getSubmitToRequestorDialog(submitRequestorTarget?.noBa)
  const confirmRequestorDialog = getConfirmRequestorDialog(confirmTarget?.noBa)
  const reopenExpiredDialog = getReopenExpiredDialog(reopenExpiredTarget?.noBa, reopenExpiredTarget?.expiredFromStatus)
  const rejectRequestorConfirmDialog = getRejectRequestorConfirmDialog(rejectTarget?.noBa)



  useEffect(() => {

    arkaApi

      .get('/fleet/projects')

      .then(res => setProjects(Array.isArray(res.data) ? res.data : []))

      .catch(() => setProjects([]))

  }, [])



  const handleFilterChange = (key, value) => {

    setFilters(prev => ({ ...prev, [key]: value }))

  }



  const handleExport = useCallback(async () => {

    const params = buildCannibalExportQuery(filters)



    const response = await fetch(apiPath(`/exports/cannibals/?${params.toString()}`))

    const blob = await response.blob()

    const url = window.URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url

    link.download = 'cannibal-ba.xlsx'

    link.click()

    window.URL.revokeObjectURL(url)

  }, [filters])



  const columns = useMemo(

    () =>

      buildCannibalGridColumns({

        canEdit,

        canSubmitPlant,

        canSubmitApproval,

        canClose: canCloseBa,

        canEditExecution,

        canEditLogistic,

        canReopen,

        currentUserId: auth.user?.id,

        handleRowAction

      }),

    [canEdit, canSubmitPlant, canSubmitApproval, canCloseBa, canEditExecution, canEditLogistic, canReopen, auth.user?.id, handleRowAction]

  )



  return (

    <Grid container spacing={6}>

      <Grid item xs={12}>

        <PageHeader

          title={<Typography variant='h4'>Cannibal BA</Typography>}

          subtitle={

            <Typography sx={{ color: 'text.secondary' }}>

              Berita Acara kanibal — REMOVE / INSTALL komponen antar unit

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

            canCreate={canCreate}

            canExport={canExport}

            onExport={handleExport}

          />

          <DataGrid

            autoHeight

            rowHeight={72}

            columns={columns}

            getRowId={row => row.idBa}

            disableRowSelectionOnClick

            {...serverGridProps}

          />

        </Card>

      </Grid>



      <CannibalDialog

        open={dialogOpen}

        onClose={closeDialog}

        onSave={handleSave}

        initialData={editTarget}

        defaultProjectCode={auth.user?.projectCodes?.[0] ?? auth.user?.projectCode ?? '000H'}

      />

      <RejectCannibalRequestorDialog
        open={rejectOpen}
        loading={rejecting}
        onClose={closeRejectDialog}
        onConfirm={handleRejectRequestor}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Cannibal BA?'
        message={
          deleteTarget
            ? `Are you sure you want to delete BA ${deleteTarget.noBa ?? deleteTarget.idBa}? You won't be able to revert this!`
            : ''
        }
        loading={deleting}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteConfirm}
      />

      <DeleteConfirmDialog
        open={submitRequestorOpen}
        title={submitToRequestorDialog.title}
        message={submitToRequestorDialog.message}
        confirmLabel={submitToRequestorDialog.confirmLabel}
        confirmColor={submitToRequestorDialog.confirmColor}
        loading={submittingRequestor}
        onClose={closeSubmitRequestorDialog}
        onConfirm={handleSubmitToRequestorProceed}
      />

      <DeleteConfirmDialog
        open={confirmOpen}
        title={confirmRequestorDialog.title}
        message={confirmRequestorDialog.message}
        confirmLabel={confirmRequestorDialog.confirmLabel}
        confirmColor={confirmRequestorDialog.confirmColor}
        loading={confirming}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmRequestorProceed}
      />

      <DeleteConfirmDialog
        open={rejectConfirmOpen}
        title={rejectRequestorConfirmDialog.title}
        message={rejectRequestorConfirmDialog.message}
        confirmLabel={rejectRequestorConfirmDialog.confirmLabel}
        confirmColor={rejectRequestorConfirmDialog.confirmColor}
        onClose={closeRejectConfirmDialog}
        onConfirm={handleRejectRequestorProceed}
      />

      <DeleteConfirmDialog
        open={reopenExpiredOpen}
        title={reopenExpiredDialog.title}
        message={reopenExpiredDialog.message}
        confirmLabel={reopenExpiredDialog.confirmLabel}
        confirmColor={reopenExpiredDialog.confirmColor}
        loading={reopeningExpired}
        onClose={closeReopenExpiredDialog}
        onConfirm={handleReopenExpiredConfirm}
      />

    </Grid>

  )

}



CannibalListPage.authGuard = true



export default CannibalListPage

