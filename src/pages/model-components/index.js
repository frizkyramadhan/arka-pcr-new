// ** React Imports
import { useEffect, useMemo, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

// ** Third Party Imports
import toast from 'react-hot-toast'

// ** Custom Components Imports
import PageHeader from 'src/@core/components/page-header'
import CustomTextField from 'src/@core/components/mui/text-field'
import { TableCrudActions } from 'src/@core/components/table-row-actions'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

// ** View Components
import ModelComponentDialog from 'src/views/pcr/model-components/ModelComponentDialog'

// ** Hooks
import useCan from 'src/hooks/useCan'
import useServerDataGrid from 'src/hooks/useServerDataGrid'

const ModelComponentsPage = () => {
  const { can } = useCan()
  const canEdit = can('model-components.update')

  const [models, setModels] = useState([])
  const [components, setComponents] = useState([])
  const [modelFilter, setModelFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [fleetOffline, setFleetOffline] = useState(false)

  const filterParams = useMemo(() => {
    const params = {}
    if (modelFilter) params.fleetModelId = modelFilter

    return params
  }, [modelFilter])

  const { serverGridProps, reload } = useServerDataGrid({
    apiPath: '/model-components',
    filterParams
  })

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [modelRes, componentRes] = await Promise.all([
          arkaApi.get('/fleet/models'),
          arkaApi.get('/components', { params: { pageSize: 500 } })
        ])
        setModels(Array.isArray(modelRes.data) ? modelRes.data : [])
        setComponents(unwrapListPayload(componentRes.data))
        setFleetOffline(Array.isArray(modelRes.data) && modelRes.data.length === 0)
      } catch (error) {
        toast.error('Failed to load model/component options')
      }
    }

    loadMeta()
  }, [])

  const modelMap = useMemo(() => {
    const map = new Map()
    models.forEach(model => map.set(model.model_id, model))

    return map
  }, [models])

  const handleSave = async formData => {
    const payload = {
      fleetModelId: Number(formData.fleetModelId),
      idComp: Number(formData.idComp),
      policy: formData.policy ? Number(formData.policy) : null,
      price: formData.price ? Number(formData.price) : null,
      lifeType: formData.lifeType || null
    }

    try {
      if (selected) {
        await arkaApi.put(`/model-components/${selected.idMod}`, {
          policy: payload.policy,
          price: payload.price,
          lifeType: payload.lifeType
        })
        toast.success('Policy updated')
      } else {
        await arkaApi.post('/model-components', payload)
        toast.success('Policy created')
      }
      setDialogOpen(false)
      setSelected(null)
      reload()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleDelete = async row => {
    try {
      await arkaApi.delete(`/model-components/${row.idMod}`)
      toast.success('Policy deleted')
      reload()
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  const columns = [
    { flex: 0.15, minWidth: 80, field: 'idMod', headerName: 'ID' },
    { flex: 0.2, minWidth: 120, field: 'fleetModelId', headerName: 'Model ID' },
    {
      flex: 0.25,
      minWidth: 160,
      field: 'modelLabel',
      headerName: 'Model',
      valueGetter: ({ row }) => modelMap.get(row.fleetModelId)?.model ?? row.fleetModelId
    },
    {
      flex: 0.25,
      minWidth: 180,
      field: 'compDesc',
      headerName: 'Component',
      valueGetter: ({ row }) => row.comp?.compDesc ?? ''
    },
    { flex: 0.15, minWidth: 100, field: 'policy', headerName: 'Policy' },
    { flex: 0.15, minWidth: 100, field: 'price', headerName: 'Price' },
    { flex: 0.15, minWidth: 100, field: 'lifeType', headerName: 'Life Type' },
    {
      flex: 0.1,
      minWidth: 80,
      sortable: false,
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <TableCrudActions
          row={row}
          canEdit={canEdit}
          onEdit={item => {
            setSelected(item)
            setDialogOpen(true)
          }}
          onDelete={handleDelete}
        />
      )
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        {fleetOffline ? (
          <Alert severity='info' sx={{ mb: 4 }}>
            Fleet API belum aktif. Set `FLEET_API_ENABLED=true`, `PROJECTS_API_URL`, dan `ARK_FLEET_UNITS_URL` di
            `.env.local` setelah ark-fleet dapat diakses. Policy lokal tetap bisa dikelola jika `fleetModelId` sudah
            diketahui.
          </Alert>
        ) : null}
        <PageHeader
          title={<Typography variant='h4'>Model Component Policy</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>Map Fleet model to component policy and pricing</Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <Box
            sx={{
              p: 6,
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <CustomTextField
              select
              label='Filter by Model'
              value={modelFilter}
              onChange={e => setModelFilter(e.target.value)}
              sx={{ minWidth: 260 }}
            >
              <MenuItem value=''>All Models</MenuItem>
              {models.map(model => (
                <MenuItem key={model.model_id} value={String(model.model_id)}>
                  {model.model} ({model.manufacture})
                </MenuItem>
              ))}
            </CustomTextField>
            {canEdit ? (
              <Button
                variant='contained'
                startIcon={<Icon icon='tabler:plus' />}
                onClick={() => {
                  setSelected(null)
                  setDialogOpen(true)
                }}
              >
                Add Policy
              </Button>
            ) : null}
          </Box>
          <DataGrid
            autoHeight
            columns={columns}
            getRowId={row => row.idMod}
            disableRowSelectionOnClick
            {...serverGridProps}
          />
        </Card>
      </Grid>
      <ModelComponentDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelected(null)
        }}
        initialData={selected}
        models={models}
        components={components}
        onSubmit={handleSave}
      />
    </Grid>
  )
}

ModelComponentsPage.authGuard = true

export default ModelComponentsPage
