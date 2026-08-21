/**
 * Reusable MUI DataGrid with server-side search, sort, and pagination.
 * Demo defaults target /api/table/data; pass props to reuse on feature pages (e.g. /users).
 */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import { DataGrid } from '@mui/x-data-grid'

import axios from 'axios'

import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ServerSideToolbar from 'src/views/table/data-grid/ServerSideToolbar'

import { getInitials } from 'src/@core/utils/get-initials'

/** Stable default — avoid `extraParams = {}` creating new object each render (infinite fetch loop). */
const EMPTY_EXTRA_PARAMS = Object.freeze({})

const renderDemoClient = params => {
  const { row } = params
  const stateNum = Math.floor(Math.random() * 6)
  const states = ['success', 'error', 'warning', 'info', 'primary', 'secondary']
  const color = states[stateNum]

  if (row.avatar.length) {
    return <CustomAvatar src={`/images/avatars/${row.avatar}`} sx={{ mr: 3, width: '1.875rem', height: '1.875rem' }} />
  }

  return (
    <CustomAvatar skin='light' color={color} sx={{ mr: 3, fontSize: '.8rem', width: '1.875rem', height: '1.875rem' }}>
      {getInitials(row.full_name ? row.full_name : 'John Doe')}
    </CustomAvatar>
  )
}

const demoStatusObj = {
  1: { title: 'current', color: 'primary' },
  2: { title: 'professional', color: 'success' },
  3: { title: 'rejected', color: 'error' },
  4: { title: 'resigned', color: 'warning' },
  5: { title: 'applied', color: 'info' }
}

const demoColumns = [
  {
    flex: 0.25,
    minWidth: 290,
    field: 'full_name',
    headerName: 'Name',
    renderCell: params => {
      const { row } = params

      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {renderDemoClient(params)}
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography noWrap variant='body2' sx={{ color: 'text.primary', fontWeight: 600 }}>
              {row.full_name}
            </Typography>
            <Typography noWrap variant='caption'>
              {row.email}
            </Typography>
          </Box>
        </Box>
      )
    }
  },
  {
    flex: 0.175,
    type: 'date',
    minWidth: 120,
    headerName: 'Date',
    field: 'start_date',
    valueGetter: params => new Date(params.value),
    renderCell: params => (
      <Typography variant='body2' sx={{ color: 'text.primary' }}>
        {params.row.start_date}
      </Typography>
    )
  },
  {
    flex: 0.175,
    minWidth: 110,
    field: 'salary',
    headerName: 'Salary',
    renderCell: params => (
      <Typography variant='body2' sx={{ color: 'text.primary' }}>
        {params.row.salary}
      </Typography>
    )
  },
  {
    flex: 0.125,
    field: 'age',
    minWidth: 80,
    headerName: 'Age',
    renderCell: params => (
      <Typography variant='body2' sx={{ color: 'text.primary' }}>
        {params.row.age}
      </Typography>
    )
  },
  {
    flex: 0.175,
    minWidth: 140,
    field: 'status',
    headerName: 'Status',
    renderCell: params => {
      const status = demoStatusObj[params.row.status]

      return (
        <CustomChip
          rounded
          size='small'
          skin='light'
          color={status.color}
          label={status.title}
          sx={{ '& .MuiChip-label': { textTransform: 'capitalize' } }}
        />
      )
    }
  }
]

function slicePage(data, page, pageSize) {
  return data.slice(page * pageSize, (page + 1) * pageSize)
}

const TableServerSide = ({
  title = 'Server Side',
  apiPath = '/api/table/data',
  apiClient = axios,
  columns = demoColumns,
  getRowId = row => row.id,
  defaultSortField = 'full_name',
  defaultSortOrder = 'asc',
  extraParams,
  refreshKey = 0,
  hideCard = false,
  checkboxSelection = true,
  disableRowSelectionOnClick = false,
  pageSizeOptions = [7, 10, 25, 50],
  initialPageSize = 7,
  rowHeight,
  getRowHeight,
  headerSlot = null,
  sx,
  searchPlaceholder = 'Search…',
  hideToolbar = false,
  searchValue: controlledSearchValue,
  onSearchChange,
  onResponse = null,
  onRowClick = null,

  /** When true, API returns paginated { total, data } — fetch per page instead of caching full dataset. */
  serverPagination = false,

  /** Show CSV export in toolbar (default true). */
  showExport = true
}) => {
  const resolvedExtraParams = extraParams ?? EMPTY_EXTRA_PARAMS
  const extraParamsKey = useMemo(() => JSON.stringify(resolvedExtraParams), [resolvedExtraParams])

  const [total, setTotal] = useState(0)
  const [sort, setSort] = useState(defaultSortOrder)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [internalSearchValue, setInternalSearchValue] = useState('')
  const searchValue = controlledSearchValue !== undefined ? controlledSearchValue : internalSearchValue
  const [sortColumn, setSortColumn] = useState(defaultSortField)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: initialPageSize })

  const cachedDataRef = useRef([])
  const paginationModelRef = useRef(paginationModel)
  paginationModelRef.current = paginationModel

  const applyPageSlice = useCallback((data, pageModel = paginationModelRef.current) => {
    setRows(slicePage(data, pageModel.page, pageModel.pageSize))
  }, [])

  const fetchTableData = useCallback(async () => {
    setLoading(true)

    try {
      const pageModel = paginationModelRef.current

      const params = {
        q: searchValue,
        sort,
        column: sortColumn,
        ...resolvedExtraParams
      }

      if (serverPagination) {
        params.page = pageModel.page
        params.pageSize = pageModel.pageSize
      }

      const res = await apiClient.get(apiPath, { params })

      const payload = res.data
      const data = Array.isArray(payload) ? payload : (payload.data ?? [])
      const count = Array.isArray(payload) ? payload.length : (payload.total ?? data.length)

      if (serverPagination) {
        setRows(data)
        setTotal(count)
      } else {
        cachedDataRef.current = data
        setTotal(count)
        applyPageSlice(data)
      }

      if (onResponse) onResponse(res)
    } finally {
      setLoading(false)
    }
  }, [
    apiClient,
    apiPath,
    applyPageSlice,
    extraParamsKey,
    onResponse,
    searchValue,
    serverPagination,
    sort,
    sortColumn
  ])

  useEffect(() => {
    setPaginationModel(prev => (prev.page === 0 ? prev : { ...prev, page: 0 }))
  }, [extraParamsKey, searchValue])

  useEffect(() => {
    fetchTableData()
  }, [fetchTableData, refreshKey])

  const handleSortModel = newModel => {
    if (newModel.length) {
      setSort(newModel[0].sort)
      setSortColumn(newModel[0].field)
    } else {
      setSort(defaultSortOrder)
      setSortColumn(defaultSortField)
    }
  }

  const handlePaginationModelChange = useCallback(
    newModel => {
      paginationModelRef.current = newModel
      setPaginationModel(newModel)

      if (serverPagination) {
        fetchTableData()
      } else {
        applyPageSlice(cachedDataRef.current, newModel)
      }
    },
    [applyPageSlice, fetchTableData, serverPagination]
  )

  const handleSearch = value => {
    if (onSearchChange) {
      onSearchChange(value)
    } else {
      setInternalSearchValue(value)
    }

    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }

  const toolbarSlots = hideToolbar ? {} : { toolbar: ServerSideToolbar }

  const toolbarSlotProps = hideToolbar
    ? {}
    : {
        baseButton: {
          size: 'medium',
          variant: 'tonal'
        },
        toolbar: {
          value: searchValue,
          clearSearch: () => handleSearch(''),
          onChange: event => handleSearch(event.target.value),
          placeholder: searchPlaceholder,
          showExport
        }
      }

  const grid = (
    <>
      {headerSlot}
      <DataGrid
        autoHeight
        pagination
        rows={rows}
        rowCount={total}
        columns={columns}
        loading={loading}
        getRowId={getRowId}
        checkboxSelection={checkboxSelection}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        sortingMode='server'
        paginationMode='server'
        pageSizeOptions={pageSizeOptions}
        paginationModel={paginationModel}
        onSortModelChange={handleSortModel}
        slots={toolbarSlots}
        onPaginationModelChange={handlePaginationModelChange}
        rowHeight={getRowHeight ? undefined : rowHeight}
        getRowHeight={getRowHeight}
        onRowClick={onRowClick}
        sx={sx}
        slotProps={toolbarSlotProps}
      />
    </>
  )

  if (hideCard) {
    return grid
  }

  return (
    <Card>
      {title ? <CardHeader title={title} /> : null}
      {grid}
    </Card>
  )
}

export default TableServerSide
