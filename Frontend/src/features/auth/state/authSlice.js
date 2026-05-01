import { createSlice } from "@reduxjs/toolkit";
import { verifyOtp } from "../services/asyncThunk.api";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    otp: {
      sent: false,
      verifying: false,
      error: null,
      success: false,
    },
    userId: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setUserId: (state, action) => {
      state.userId = action.payload;
    },
    setOtpSent: (state, action) => {
      state.otp.sent = action.payload;
    },
    clearAuthState: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      state.isAuthenticated = false;
      state.userId = null;
      state.otp = {
        sent: false,
        verifying: false,
        error: null,
        success: false,
      };
    },
  },


  extraReducers:(builder) => {
    builder.addCase(verifyOtp.pending, (state) => {
      state.otp.verifying = true;
      state.otp.error = null;
    });
    builder.addCase(verifyOtp.fulfilled, (state) => {
      state.otp.verifying = false;
        state.otp.success = true;
          state.otp.error = null;
    });
    builder.addCase(verifyOtp.rejected, (state, action) => {
      state.otp.verifying = false;
      state.otp.error = action.payload || "OTP verification failed";
    });
  }
});

export const {
  setUser,
  setLoading,
  setError,
  setAuthenticated,
  setUserId,
  clearAuthState,
    setOtpSent
} = authSlice.actions;

export default authSlice.reducer;