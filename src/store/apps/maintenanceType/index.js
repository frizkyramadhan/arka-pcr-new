import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import arkaApi from 'src/utils/arka-api'

// ** ARKA MMS: API /api/maintenance-types (Next.js API routes + Prisma)

export const fetchData = createAsyncThunk('appMaintenanceTypes/fetchData', async params => {
  const response = await arkaApi.get('/maintenance-types', { params })
  
return response.data
})

export const addMaintenanceType = createAsyncThunk(
  'appMaintenanceTypes/addMaintenanceType',
  async (data, { getState, dispatch }) => {
    const response = await arkaApi.post('/maintenance-types', data)
    dispatch(fetchData(getState().maintenanceType.params))
    
return response.data
  }
)

export const updateMaintenanceType = createAsyncThunk(
  'appMaintenanceTypes/updateMaintenanceType',
  async ({ id, data }, { getState, dispatch }) => {
    const response = await arkaApi.patch(`/maintenance-types/${id}`, data)
    dispatch(fetchData(getState().maintenanceType.params))
    
return response.data
  }
)

export const deleteMaintenanceType = createAsyncThunk(
  'appMaintenanceTypes/deleteMaintenanceType',
  async (id, { getState, dispatch }) => {
    await arkaApi.delete(`/maintenance-types/${id}`)
    dispatch(fetchData(getState().maintenanceType.params))
    
return { id }
  }
)

export const appMaintenanceTypesSlice = createSlice({
  name: 'appMaintenanceTypes',
  initialState: {
    data: [],
    total: 0,
    params: {},
    allData: []
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchData.fulfilled, (state, action) => {
        state.data = action.payload.maintenanceTypes
        state.total = action.payload.total
        state.params = action.payload.params
        state.allData = action.payload.allData
      })
      .addCase(updateMaintenanceType.fulfilled, (state, action) => {
        const item = action.payload?.maintenanceType
        if (!item) return
        const idx = state.data.findIndex(m => m.id === item.id)
        if (idx !== -1) state.data[idx] = item
        const allIdx = state.allData.findIndex(m => m.id === item.id)
        if (allIdx !== -1) state.allData[allIdx] = item
      })
  }
})

export default appMaintenanceTypesSlice.reducer
