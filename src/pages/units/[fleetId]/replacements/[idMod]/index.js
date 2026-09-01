/**
 * Replacement Detail — riwayat replacement per component (legacy unit/replacement).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'

import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'
import { formatUploadError } from 'src/utils/format-upload-error'
import { canExecuteReplacementRow } from 'src/utils/replacement-row-auth'
import { pickAndUploadReplacementReport } from 'src/utils/pick-replacement-report-upload'

import useCan from 'src/hooks/useCan'

import ReplacementDialog from 'src/views/pcr/replacements/ReplacementDialog'
import ReplacementRowActions from 'src/views/pcr/replacements/replacementRowActions'
import ReplacementForecastLink from 'src/views/pcr/replacements/ReplacementForecastLink'
import CloseReplacementDialog from 'src/views/pcr/replacements/CloseReplacementDialog'
import ReopenReplacementDialog from 'src/views/pcr/replacements/ReopenReplacementDialog'
import ForecastDialog from 'src/views/pcr/forecasts/ForecastDialog'
import ReplacementDetailInfo from 'src/views/pcr/units/detail/ReplacementDetailInfo'
import { SapDocumentBadge, SapDocumentChain } from 'src/views/pcr/sap'

const formatNumber = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)

  return Number.isFinite(num) ? num.toLocaleString('id-ID') : '—'
}

const formatLifePercent = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)

  return Number.isFinite(num)
    ? `${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} %`
    : '—'
}

/** Kolom DataGrid — judul penuh di tooltip saat hover. */
const withHeaderTooltip = (title, column = {}) => ({
  ...column,
  headerName: title,
  renderHeader: () => (
    <Tooltip title={title} enterDelay={400}>
      <Typography
        component='span'
        variant='body2'
        sx={{
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
          width: '100%'
        }}
      >
        {title}
      </Typography>
    </Tooltip>
  )
})

const gridSx = {
  minWidth: '100%',
  border: 0,
  '& .MuiDataGrid-columnHeaders': { borderRadius: 0 },
  '& .MuiDataGrid-cell': {
    whiteSpace: 'nowrap',
    overflow: 'visible',
    textOverflow: 'clip'
  },
  '& .MuiDataGrid-columnHeaderTitle': { whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip' },
  '& .MuiDataGrid-virtualScroller': { overflowX: 'auto' }
}

const ReplacementDetailPage = () => {
  const router = useRouter()
  const { can, canAny } = useCan()
  const { fleetId, idMod } = router.query

  const canEdit = can('replacements.update')
  const canDelete = can('replacements.delete')
  const canCreateForecast = can('forecasts.create')
  const canManageClosed = canAny(['system.admin', 'replacements.update'])
  const canEditClosed = canAny(['system.admin', 'replacements.edit.close'])

  const [context, setContext] = useState(null)
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [reopenTarget, setReopenTarget] = useState(null)
  const [reopening, setReopening] = useState(false)
  const [closeTarget, setCloseTarget] = useState(null)
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false)
  const [forecastTarget, setForecastTarget] = useState(null)
  const [chainRow, setChainRow] = useState(null)
  const [chainSession, setChainSession] = useState(0)

  const isMajor = context?.component?.compType === 'MAJOR'

  const fetchData = useCallback(async () => {
    if (!fleetId || !idMod) return

    setLoading(true)

    try {
      const { data } = await arkaApi.get('/replacements/component-detail', {
        params: {
          fleetUnitId: fleetId,
          idMod,
          page: paginationModel.page,
          pageSize: paginationModel.pageSize
        }
      })

      setContext(data)
      const nextRows = data.rows ?? []
      setRows(nextRows)
      setRowCount(data.total ?? 0)
      setChainRow(prev => {
        if (!prev) return null

        return nextRows.find(row => row.idRep === prev.idRep) ?? null
      })
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Replacement detail not found')
        router.replace(`/units/${fleetId}?tab=actual`)
      } else {
        toast.error('Failed to load replacement detail')
      }
    } finally {
      setLoading(false)
    }
  }, [fleetId, idMod, paginationModel.page, paginationModel.pageSize, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async formData => {
    if (!selected) {
      toast.error('New work orders must be created from PCR Forecast')

      return
    }

    try {
      await arkaApi.put(`/replacements/${selected.idRep}`, formData)
      toast.success('Work order updated')
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleRowAction = useCallback(
    async (action, row) => {
      try {
        if (action === 'edit') {
          const { data } = await arkaApi.get(`/replacements/${row.idRep}`)
          setSelected(data)
          setDialogOpen(true)

          return
        }

        if (action === 'close') {
          setCloseTarget(row)

          return
        }

        if (action === 'upload') {
          pickAndUploadReplacementReport(row.idRep, { onSuccess: fetchData })

          return
        }

        if (action === 'view-report') {
          window.open(`/api/replacements/${row.idRep}/report/`, '_blank')

          return
        }

        if (action === 'delete-report') {
          await arkaApi.delete(`/replacements/${row.idRep}/report`)
          toast.success('Report removed')
        }

        if (action === 'delete') {
          setDeleteTarget(row)

          return
        }

        if (action === 'reopen') {
          setReopenTarget(row)

          return
        }

        if (action === 'create-forecast') {
          setForecastTarget(row)
          setForecastDialogOpen(true)

          return
        }

        fetchData()
      } catch (error) {
        toast.error(error.userMessage ?? formatUploadError(error, { fallback: 'Action failed' }))
      }
    },
    [fetchData]
  )

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await arkaApi.delete(`/replacements/${deleteTarget.idRep}`)
      toast.success('Work order deleted')
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleReopenConfirm = async () => {
    if (!reopenTarget) return

    setReopening(true)
    try {
      await arkaApi.post(`/replacements/${reopenTarget.idRep}/reopen`)
      toast.success('Work order reopened')
      setReopenTarget(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Reopen failed')
    } finally {
      setReopening(false)
    }
  }

  useEffect(() => {
    setChainRow(null)
    setChainSession(0)
  }, [fleetId, idMod])

  const handleSelectChainRow = useCallback(row => {
    setChainRow(row)
    setChainSession(session => session + 1)
  }, [])

  const canSetProcurementReference = useMemo(() => {
    if (!chainRow) return false
    if (chainRow.woStatus === 'CLOSE') return canEditClosed

    return canEdit && canExecuteReplacementRow(chainRow)
  }, [canEdit, canEditClosed, chainRow])

  const handleSetProcurementReference = useCallback(
    async (docType, docNum) => {
      if (!chainRow?.idRep) return

      try {
        await arkaApi.put(`/replacements/${chainRow.idRep}`, {
          mrNo: docType === 'mr' ? String(docNum) : chainRow.mrNo || null,
          prNo: docType === 'pr' ? String(docNum) : chainRow.prNo || null,
          poNo: docType === 'po' ? String(docNum) : chainRow.poNo || null
        })
        toast.success(`${docType.toUpperCase()}# set as PCR reference`)
        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Failed to update procurement reference')
        throw error
      }
    },
    [chainRow, fetchData]
  )

  const handleRemoveProcurementReference = useCallback(
    async docType => {
      if (!chainRow?.idRep) return

      try {
        await arkaApi.put(`/replacements/${chainRow.idRep}`, {
          mrNo: docType === 'mr' ? null : chainRow.mrNo || null,
          prNo: docType === 'pr' ? null : chainRow.prNo || null,
          poNo: docType === 'po' ? null : chainRow.poNo || null
        })
        toast.success(`${docType.toUpperCase()}# removed from PCR reference`)
        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Failed to remove procurement reference')
        throw error
      }
    },
    [chainRow, fetchData]
  )

  const handleForecastCreate = async formData => {
    const payload = forecastTarget?.idRep ? { ...formData, idRep: forecastTarget.idRep } : formData
    const { data } = await arkaApi.post('/forecasts', payload, { skipGlobalErrorToast: true })
    toast.success('Forecast created')
    setForecastDialogOpen(false)
    setForecastTarget(null)
    fetchData()
    if (data?.idForecast) {
      router.push(`/forecasts/${data.idForecast}`)
    }
  }

  const handleOpenCreateForecast = () => {
    setForecastTarget(null)
    setForecastDialogOpen(true)
  }

  const showCreateForecast = canCreateForecast && !loading && context && rowCount === 0

  const columns = useMemo(() => {
    const base = [
      withHeaderTooltip('No', {
        width: 56,
        field: 'rowNo',
        sortable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: params =>
          paginationModel.page * paginationModel.pageSize + params.api.getRowIndexRelativeToVisibleRows(params.id) + 1
      }),
      withHeaderTooltip('% Life', {
        width: 88,
        field: 'lifePercent',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatLifePercent(value)
      }),
      withHeaderTooltip('Comp. Life', {
        width: 100,
        field: 'compLife',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatNumber(value)
      }),
      withHeaderTooltip('Comp. Cond', {
        width: 96,
        field: 'compCond',
        align: 'center',
        headerAlign: 'center',
        valueFormatter: ({ value }) => (value != null && value !== '' ? String(value) : '—')
      }),
      withHeaderTooltip('H/M Unit', {
        width: 100,
        field: 'hmUnit',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatNumber(value)
      }),
      withHeaderTooltip('WH/day', {
        width: 80,
        field: 'whDay',
        align: 'center',
        headerAlign: 'center',
        valueFormatter: ({ value }) => formatNumber(value)
      }),
      withHeaderTooltip('Work Order', {
        width: 190,
        minWidth: 190,
        field: 'woNo',
        renderCell: ({ row }) => (
          <SapDocumentBadge type='wo' docNum={row.woNo} onClick={() => handleSelectChainRow(row)} />
        )
      }),
      withHeaderTooltip('WO Schedule Date', {
        width: 140,
        field: 'woDate',
        valueFormatter: ({ value }) => formatDisplayDate(value)
      }),
      withHeaderTooltip('WO Status', {
        width: 110,
        field: 'woStatus',
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={row.woStatus}
            color={row.woStatus === 'OPEN' ? 'warning' : 'success'}
          />
        )
      }),
      withHeaderTooltip('WO Complete Date', {
        width: 150,
        field: 'woEndDate',
        valueFormatter: ({ value }) => formatDisplayDate(value)
      }),
      withHeaderTooltip('Installed Comp. Hrs', {
        width: 140,
        field: 'compHour',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatNumber(value)
      }),
      withHeaderTooltip('Last Replacement H/M', {
        width: 150,
        field: 'lastHmRep',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatNumber(value)
      }),
      withHeaderTooltip('Last Replacement Date', {
        width: 160,
        field: 'lastRepDate',
        valueFormatter: ({ value }) => formatDisplayDate(value)
      }),
      withHeaderTooltip('Next Replacement Date', {
        width: 170,
        field: 'nextReplacementDate',
        valueFormatter: ({ value }) => formatDisplayDate(value)
      }),
      withHeaderTooltip('MR No.', {
        width: 190,
        minWidth: 190,
        field: 'mrNo',
        renderCell: ({ row }) => <SapDocumentBadge type='mr' docNum={row.mrNo} readOnly />
      }),
      withHeaderTooltip('PR No.', {
        width: 190,
        minWidth: 190,
        field: 'prNo',
        renderCell: ({ row }) => <SapDocumentBadge type='pr' docNum={row.prNo} readOnly />
      }),
      withHeaderTooltip('PO No.', {
        width: 190,
        minWidth: 190,
        field: 'poNo',
        renderCell: ({ row }) => <SapDocumentBadge type='po' docNum={row.poNo} readOnly />
      })
    ]

    if (isMajor) {
      base.push(
        withHeaderTooltip('Report', {
          width: 80,
          field: 'report',
          sortable: false,
          align: 'center',
          headerAlign: 'center',
          renderCell: ({ row }) =>
            row.report ? (
              <IconButton onClick={() => handleRowAction('view-report', row)}>
                <Icon icon='tabler:download' />
              </IconButton>
            ) : (
              '—'
            )
        })
      )
    }

    base.push(
      withHeaderTooltip('PCR Forecast', {
        width: 200,
        field: 'linkedForecast',
        sortable: false,
        renderCell: ({ row }) => <ReplacementForecastLink linkedForecast={row.linkedForecast} />
      }),
      withHeaderTooltip('Remarks', {
        width: 280,
        field: 'remarks',
        valueGetter: ({ row }) => row.remarks || '—'
      }),
      withHeaderTooltip('Actions', {
        width: 220,
        sortable: false,
        field: 'actions',
        renderCell: ({ row }) => (
          <ReplacementRowActions
            row={row}
            canEdit={canEdit}
            onAction={handleRowAction}
            options={{
              canDelete,
              canManageClosed,
              canEditClosed,
              isMajor,
              canCreateForecast
            }}
          />
        )
      })
    )

    return base
  }, [
    canCreateForecast,
    canDelete,
    canEdit,
    canEditClosed,
    canManageClosed,
    handleRowAction,
    handleSelectChainRow,
    isMajor,
    paginationModel.page,
    paginationModel.pageSize
  ])

  if (!fleetId || !idMod) {
    return null
  }

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 3,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            width: '100%'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
            <Button
              variant='tonal'
              color='secondary'
              startIcon={<Icon icon='tabler:arrow-left' />}
              onClick={() => router.push(`/units/${fleetId}?tab=actual`)}
              sx={{ mt: 0.5 }}
            >
              Back
            </Button>
            <PageHeader
              title={
                <Typography variant='h5' sx={{ fontWeight: 600 }}>
                  Replacement Detail
                </Typography>
              }
              subtitle={
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {context?.component?.compDesc ?? '—'}
                </Typography>
              }
            />
          </Box>
          {showCreateForecast ? (
            <Button
              variant='contained'
              startIcon={<Icon icon='tabler:calendar-plus' />}
              onClick={handleOpenCreateForecast}
            >
              Create Forecast
            </Button>
          ) : null}
        </Box>
      </Grid>

      <Grid item xs={12}>
        <ReplacementDetailInfo
          unit={context?.unit}
          component={context?.component}
          latestHmUnit={context?.latestHmUnit}
          latestHmDate={context?.latestHmDate}
        />
      </Grid>

      <Grid item xs={12}>
        {chainRow ? (
          <SapDocumentChain
            key={`${chainRow.idRep}-${chainSession}`}
            woNo={chainRow.woNo}
            mrNo={chainRow.mrNo}
            prNo={chainRow.prNo}
            poNo={chainRow.poNo}
            title={`SAP Document Chain — Replacement #${chainRow.idRep}`}
            defaultExpanded
            hideWhenEmpty={false}
            referenceScope='replacement'
            baReference={{ mrNo: chainRow.mrNo, prNo: chainRow.prNo, poNo: chainRow.poNo }}
            canSetBaReference={canSetProcurementReference}
            onSetBaReference={handleSetProcurementReference}
            onRemoveBaReference={handleRemoveProcurementReference}
          />
        ) : null}
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ overflow: 'hidden' }}>
          {!loading && rowCount === 0 ? (
            <Box sx={{ py: 8, px: 4, textAlign: 'center' }}>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                No replacement history for this component yet. Work orders start from an approved PCR Forecast
                {showCreateForecast ? ' — use Create Forecast above to plan the first work order.' : '.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <DataGrid
                autoHeight
                rows={rows}
                columns={columns}
                loading={loading}
                getRowId={row => row.idRep}
                rowCount={rowCount}
                paginationMode='server'
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                rowHeight={44}
                sx={gridSx}
              />
            </Box>
          )}
        </Card>
      </Grid>

      <ReplacementDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onExited={() => setSelected(null)}
        fleetUnitId={Number(fleetId)}
        fleetModelId={context?.unit?.modelId}
        initialData={selected}
        presetIdMod={selected ? null : Number(idMod)}
        eligibleIdMods={[]}
        latestHmUnit={context?.latestHmUnit}
        onRefresh={fetchData}
        onSubmit={handleSave}
        closedEditAllowed={canEditClosed}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Work Order?'
        message={
          deleteTarget
            ? `Are you sure you want to delete WO #${
                deleteTarget.woNo ?? deleteTarget.idRep
              }? This will recalculate replacement metrics for this component.`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <CloseReplacementDialog
        open={Boolean(closeTarget)}
        idRep={closeTarget?.idRep}
        onClose={() => setCloseTarget(null)}
        onSuccess={() => {
          toast.success('Work order closed — next cycle opened')
          fetchData()
        }}
      />

      <ReopenReplacementDialog
        open={Boolean(reopenTarget)}
        idRep={reopenTarget?.idRep}
        woLabel={reopenTarget ? `WO #${reopenTarget.woNo ?? reopenTarget.idRep}` : ''}
        loading={reopening}
        onClose={() => setReopenTarget(null)}
        onConfirm={handleReopenConfirm}
      />

      <ForecastDialog
        open={forecastDialogOpen}
        onClose={() => {
          setForecastDialogOpen(false)
          setForecastTarget(null)
        }}
        fleetUnitId={Number(fleetId)}
        fleetModelId={context?.unit?.modelId}
        presetIdMod={Number(idMod)}
        onSubmit={handleForecastCreate}
      />
    </Grid>
  )
}

ReplacementDetailPage.authGuard = true

export default ReplacementDetailPage
