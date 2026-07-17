/**
 * Shared filters for forecast matrix reports (period / price).
 * Model & Component are independent of Project (not cascaded from site units).
 * Options load unpaginated so the full master list appears in selects.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import arkaApi from 'src/utils/arka-api'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

import { extractModelComponents } from 'src/views/pcr/inspections/componentOptions'

const STATUS_OPTIONS = ['', 'OPEN', 'CLOSED']

function toUniqueCompOptions(items) {
  const options = []
  const seen = new Set()

  for (const item of items) {
    const label = (item.comp?.compDesc ?? item.compDesc ?? '').trim()
    if (!label || seen.has(label)) continue
    seen.add(label)
    options.push({ value: label, label })
  }

  options.sort((a, b) => a.label.localeCompare(b.label))

  return options
}

export function useForecastMatrixFilters({ apiPath, defaultStatus = 'OPEN' }) {
  const [projects, setProjects] = useState([])
  const [models, setModels] = useState([])
  const [componentOptions, setComponentOptions] = useState([])
  const [projectCode, setProjectCode] = useState('')
  const [modelName, setModelName] = useState('')
  const [fleetModelId, setFleetModelId] = useState('')
  const [compDesc, setCompDesc] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    arkaApi
      .get('/fleet/projects')
      .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjects([]))
  }, [])

  // No pageSize — /api/models returns full list when pagination params are omitted.
  useEffect(() => {
    arkaApi
      .get('/models')
      .then(res => {
        const rows = unwrapListPayload(res.data)
        setModels(
          rows
            .map(row => ({
              fleetModelId: row.fleetModelId,
              modelName: row.model || row.modelName || ''
            }))
            .filter(row => row.modelName)
        )
      })
      .catch(() => setModels([]))
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadComponents = async () => {
      try {
        if (fleetModelId) {
          // Unpaginated per-model list.
          const res = await arkaApi.get(`/models/${fleetModelId}/components`)
          if (cancelled) return
          const items = extractModelComponents(res.data)
          setComponentOptions(toUniqueCompOptions(items))

          return
        }

        // No pageSize — /api/components returns full master list.
        const res = await arkaApi.get('/components')
        if (cancelled) return
        const rows = unwrapListPayload(res.data)
        setComponentOptions(toUniqueCompOptions(rows))
      } catch {
        if (!cancelled) setComponentOptions([])
      }
    }

    loadComponents()

    return () => {
      cancelled = true
    }
  }, [fleetModelId])

  const handleModelChange = useCallback(
    value => {
      setModelName(value)
      setCompDesc('')
      const match = models.find(item => item.modelName === value)
      setFleetModelId(match ? String(match.fleetModelId) : '')
    },
    [models]
  )

  const filterParams = useMemo(() => {
    const params = {}
    if (projectCode) params.projectCode = projectCode
    if (status) params.status = status
    if (modelName) params.modelName = modelName
    if (compDesc) params.compDesc = compDesc

    return params
  }, [compDesc, modelName, projectCode, status])

  const loadMatrix = useCallback(async () => {
    setLoading(true)
    try {
      const res = await arkaApi.get(apiPath, { params: filterParams })
      setData(res.data)
    } catch {
      setData({ periods: [], groups: [], grandTotals: {}, grandTotal: 0 })
    } finally {
      setLoading(false)
    }
  }, [apiPath, filterParams])

  useEffect(() => {
    loadMatrix()
  }, [loadMatrix])

  return {
    projects,
    models,
    componentOptions,
    projectCode,
    setProjectCode,
    modelName,
    setModelName: handleModelChange,
    compDesc,
    setCompDesc,
    status,
    setStatus,
    statusOptions: STATUS_OPTIONS,
    showProjectFilter: projects.length > 0,
    data,
    loading
  }
}

export default useForecastMatrixFilters
