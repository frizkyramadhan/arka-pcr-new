/**
 * DataGrid server-side hook — fetch list API and expose MUI DataGrid pagination/sort props.
 * Supports plain array, { total, data }, and { total, rows } API response shapes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import arkaApi from 'src/utils/arka-api'

const DEFAULT_PAGE_SIZE = 10

/** Stable empty filters — avoid new `{}` default on every render (infinite refetch). */
const EMPTY_FILTER_PARAMS = Object.freeze({})

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return { mode: 'client', rows: payload, total: payload.length }
  }

  if (payload && Array.isArray(payload.rows)) {
    return {
      mode: 'server',
      rows: payload.rows,
      total: payload.total ?? payload.rows.length
    }
  }

  if (payload && Array.isArray(payload.data)) {
    return {
      mode: 'client',
      rows: payload.data,
      total: payload.total ?? payload.data.length
    }
  }

  return { mode: 'client', rows: [], total: 0 }
}

function compareValues(a, b, order) {
  const direction = order === 'asc' ? 1 : -1

  if (a == null && b == null) return 0
  if (a == null) return -1 * direction
  if (b == null) return 1 * direction

  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return (Number(a) - Number(b)) * direction
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * direction
  }

  const left = String(a).toLowerCase()
  const right = String(b).toLowerCase()

  if (left < right) return -1 * direction
  if (left > right) return 1 * direction

  return 0
}

function sortRows(rows, field, order) {
  if (!field || !order) return rows

  return [...rows].sort((a, b) => compareValues(a[field], b[field], order))
}

function slicePage(rows, page, pageSize) {
  return rows.slice(page * pageSize, (page + 1) * pageSize)
}

/**
 * @param {object} options
 * @param {string} options.apiPath — path relative to /api (e.g. '/forecasts')
 * @param {object} [options.filterParams] — extra query params merged into each request
 * @param {import('axios').AxiosInstance} [options.apiClient]
 * @param {string|null} [options.defaultSortField]
 * @param {'asc'|'desc'} [options.defaultSortOrder]
 * @param {number} [options.initialPageSize]
 * @param {number[]} [options.pageSizeOptions]
 * @param {string} [options.searchValue]
 * @param {boolean} [options.enabled]
 */
export default function useServerDataGrid({
  apiPath,
  apiClient = arkaApi,
  filterParams,
  defaultSortField = null,
  defaultSortOrder = 'asc',
  initialPageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = [10, 25, 50],
  searchValue = '',
  enabled = true
}) {
  const resolvedFilterParams = filterParams ?? EMPTY_FILTER_PARAMS
  const filterParamsKey = JSON.stringify(resolvedFilterParams)

  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: initialPageSize })

  const [sortModel, setSortModel] = useState(
    defaultSortField ? [{ field: defaultSortField, sort: defaultSortOrder }] : []
  )

  const sortField = sortModel[0]?.field ?? null
  const sortOrder = sortModel[0]?.sort ?? null

  const applyClientView = useCallback(
    (sourceRows, pageModel = paginationModel) => {
      const sorted = sortField && sortOrder ? sortRows(sourceRows, sortField, sortOrder) : sourceRows

      setRowCount(sorted.length)
      setRows(slicePage(sorted, pageModel.page, pageModel.pageSize))
    },
    [paginationModel, sortField, sortOrder]
  )

  const fetchData = useCallback(async () => {
    if (!enabled || !apiPath) return

    setLoading(true)

    try {
      const pageModel = paginationModel

      const params = {
        page: pageModel.page,
        pageSize: pageModel.pageSize,
        ...resolvedFilterParams
      }

      if (searchValue) {
        params.q = searchValue
        params.search = searchValue
      }

      if (sortField && sortOrder) {
        params.sortField = sortField
        params.sortOrder = sortOrder
        params.column = sortField
        params.sort = sortOrder
      }

      const res = await apiClient.get(apiPath, { params })
      const normalized = normalizePayload(res.data)

      if (normalized.mode === 'server') {
        setRows(normalized.rows)
        setRowCount(normalized.total)
      } else {
        applyClientView(normalized.rows, pageModel)
      }
    } finally {
      setLoading(false)
    }
  }, [
    apiClient,
    apiPath,
    applyClientView,
    enabled,
    filterParamsKey,
    paginationModel.page,
    paginationModel.pageSize,
    refreshKey,
    searchValue,
    sortField,
    sortOrder
  ])

  useEffect(() => {
    setPaginationModel(prev => (prev.page === 0 ? prev : { ...prev, page: 0 }))
  }, [filterParamsKey, searchValue])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePaginationModelChange = useCallback(newModel => {
    setPaginationModel(newModel)
  }, [])

  const handleSortModelChange = useCallback(newModel => {
    setSortModel(newModel)
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [])

  const reload = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const serverGridProps = useMemo(
    () => ({
      rows,
      rowCount,
      loading,
      pagination: true,
      paginationMode: 'server',
      sortingMode: 'server',
      paginationModel,
      onPaginationModelChange: handlePaginationModelChange,
      sortModel,
      onSortModelChange: handleSortModelChange,
      pageSizeOptions
    }),
    [
      handlePaginationModelChange,
      handleSortModelChange,
      loading,
      pageSizeOptions,
      paginationModel,
      rowCount,
      rows,
      sortModel
    ]
  )

  return {
    serverGridProps,
    reload,
    loading,
    rows,
    rowCount
  }
}
