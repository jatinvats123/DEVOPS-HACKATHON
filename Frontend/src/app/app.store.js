import { configureStore } from '@reduxjs/toolkit'
import authSlicer from '../features/auth/state/authSlice'

export const store = configureStore({
    reducer: {authSlicer},
})