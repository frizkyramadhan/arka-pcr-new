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



// ** Utils

import arkaApi from 'src/utils/arka-api'

import {

  buildCannibalExportQuery,

  buildCannibalFilterParams,

  EMPTY_CANNIBAL_FILTERS

} from 'src/utils/cannibal-list-filters'



// ** View Components

import CannibalDialog from 'src/views/pcr/cannibal/CannibalDialog'

import CannibalTableHeader from 'src/views/pcr/cannibal/CannibalTableHeader'

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



  const [projects, setProjects] = useState([])

  const [filters, setFilters] = useState(EMPTY_CANNIBAL_FILTERS)



  const filterParams = useMemo(() => buildCannibalFilterParams(filters), [filters])



  const { serverGridProps, reload } = useServerDataGrid({

    apiPath: '/cannibals',

    filterParams

  })



  const { editTarget, dialogOpen, openCreate, closeDialog, handleRowAction, handleSave } = useCannibalRowHandlers({

    onReload: reload

  })



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



    const response = await fetch(`/api/exports/cannibals/?${params.toString()}`)

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

        handleRowAction

      }),

    [canEdit, canSubmitPlant, canSubmitApproval, canCloseBa, canEditExecution, canEditLogistic, handleRowAction]

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

            onCreate={openCreate}

            onExport={handleExport}

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



      <CannibalDialog

        open={dialogOpen}

        onClose={closeDialog}

        onSave={handleSave}

        initialData={editTarget}

        defaultProjectCode={auth.user?.projectCodes?.[0] ?? auth.user?.projectCode ?? '000H'}

      />

    </Grid>

  )

}



CannibalListPage.authGuard = true



export default CannibalListPage

