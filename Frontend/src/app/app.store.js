import { configureStore } from '@reduxjs/toolkit'
import authRouter from '../../../Backend/src/routes/user.routes'

export const store = configureStore({
    reducer: {authRouter},
})