import { createSlice } from '@reduxjs/toolkit'
import { globalActions as GlobalActions } from './actions/globalActions'
import { globalStates as GlobalStates } from './states/globalState'

export const globalSlices = createSlice({
  name: 'global',
  initialState: GlobalStates,
  reducers: GlobalActions,
})

//.actions: this property of the slice object contains all the action creators automatically generated based on the reducer functions defined in the createslice call
export const globalActions = globalSlices.actions //export action creators
export default globalSlices.reducer //exports reducer function. defined how the state should change in response to actions
