/**
 * FMS-compatible unit list store — reads FleetUnitCache via /fleet/units,
 * maps to FMS unit shape (id string, code, projectId/projectName).
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import arkaApi from 'src/utils/arka-api'

function mapFleetUnitToFms(u) {
  return {
    id: String(u.id),
    code: u.unit_no,
    model: u.model ?? null,
    description: u.description ?? null,
    projectId: u.project_code ?? null,
    projectName: u.project_code ?? null,
    manufacture: u.manufacture ?? null,
    plantGroup: u.plant_group ?? null,
    plantType: u.plant_type ?? null,
    unitStatus: u.unitstatus ?? null,
    lastSyncAt: null,
    createdAt: null,
    updatedAt: null
  }
}

export const fetchData = createAsyncThunk('appUnits/fetchData', async (params = {}) => {
  // Omit page/pageSize so fleet/units returns full filtered list for FMS pickers
  const { data } = await arkaApi.get('/fleet/units', {
    params: {
      unitNo: params.unitNo,
      model: params.model,
      project: params.project,
      manufacture: params.manufacture,
      plantGroup: params.plantGroup,
      status: params.status
    }
  })

  const rows = (data?.data ?? []).map(mapFleetUnitToFms)

  return {
    units: rows,
    allData: rows,
    total: data?.total ?? rows.length,
    params
  }
})

export const syncUnits = createAsyncThunk('appUnits/syncUnits', async (_, { dispatch }) => {
  const response = await arkaApi.post('/fleet/sync')
  dispatch(fetchData({}))

  return response.data
})

export const appUnitsSlice = createSlice({
  name: 'appUnits',
  initialState: {
    data: [],
    total: 0,
    params: {},
    allData: [],
    syncing: false
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchData.fulfilled, (state, action) => {
        state.data = action.payload.units ?? []
        state.total = action.payload.total ?? 0
        state.params = action.payload.params ?? {}
        state.allData = action.payload.allData ?? []
      })
      .addCase(syncUnits.pending, state => {
        state.syncing = true
      })
      .addCase(syncUnits.fulfilled, state => {
        state.syncing = false
      })
      .addCase(syncUnits.rejected, state => {
        state.syncing = false
      })
  }
})

export default appUnitsSlice.reducer
