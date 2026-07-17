/**
 * Shared report page state — scope filters (project/unit/component), search, server-side DataGrid.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import arkaApi from 'src/utils/arka-api'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

import useServerDataGrid from 'src/hooks/useServerDataGrid'

import {
  extractModelComponents,
  toComponentSelectOptions
} from 'src/views/pcr/inspections/componentOptions'

export default function useReportPage({
  apiPath,
  filterParams: domainFilterParams = {},
  defaultSortField = null,
  defaultSortOrder = 'asc'
}) {
  const [projects, setProjects] = useState([])
  const [equipments, setEquipments] = useState([])
  const [componentOptions, setComponentOptions] = useState([])
  const [search, setSearch] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [fleetUnitId, setFleetUnitId] = useState('')
  const [idMod, setIdMod] = useState('')

  useEffect(() => {
    arkaApi
      .get('/fleet/projects')
      .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjects([]))
  }, [])

  const loadEquipments = useCallback(async () => {
    try {
      const params = {}
      if (projectCode) params.projectCode = projectCode

      const res = await arkaApi.get('/fleet/units', { params })
      setEquipments(unwrapListPayload(res.data))
    } catch {
      setEquipments([])
    }
  }, [projectCode])

  useEffect(() => {
    loadEquipments()
  }, [loadEquipments])

  useEffect(() => {
    if (!fleetUnitId) {
      setComponentOptions([])

      return
    }

    const unit = equipments.find(item => String(item.id) === String(fleetUnitId))
    if (!unit?.model_id) {
      setComponentOptions([])

      return
    }

    arkaApi
      .get('/model-components', { params: { fleetModelId: unit.model_id, pageSize: 200 } })
      .then(res => {
        const items = extractModelComponents(res.data)
        setComponentOptions(toComponentSelectOptions(items))
      })
      .catch(() => setComponentOptions([]))
  }, [equipments, fleetUnitId])

  const showProjectFilter = projects.length > 0

  const handleProjectChange = useCallback(value => {
    setProjectCode(value)
    setFleetUnitId('')
    setIdMod('')
  }, [])

  const handleUnitChange = useCallback(value => {
    setFleetUnitId(value)
    setIdMod('')
  }, [])

  const filterParams = useMemo(() => {
    const params = { ...domainFilterParams }
    if (projectCode) params.projectCode = projectCode
    if (fleetUnitId) params.fleetUnitId = fleetUnitId
    if (idMod) params.idMod = idMod

    return params
  }, [domainFilterParams, fleetUnitId, idMod, projectCode])

  const { serverGridProps } = useServerDataGrid({
    apiPath,
    filterParams,
    searchValue: search,
    defaultSortField,
    defaultSortOrder
  })

  const exportParams = useMemo(() => {
    const params = { ...filterParams }
    if (search) {
      params.q = search
      params.search = search
    }

    return params
  }, [filterParams, search])

  return {
    projects,
    equipments,
    componentOptions,
    search,
    setSearch,
    projectCode,
    setProjectCode: handleProjectChange,
    fleetUnitId,
    setFleetUnitId: handleUnitChange,
    idMod,
    setIdMod,
    showProjectFilter,
    serverGridProps,
    exportParams
  }
}
