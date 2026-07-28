/**
 * Asynchronous thunk action to verify the OTP for a user.
 * @param {Object} payload - An object containing the userId and otp to be verified.
 * @param {string} payload.userId - The ID of the user to verify.
 * @param {string} payload.otp - The OTP code to verify.
 * @returns {Promise} A promise that resolves with the response data if the OTP verification is successful, or rejects with an error message if it fails.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { API } from '../../../lib/api/axios';

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ userId, otp }, { rejectWithValue }) => {
    try {
      const res = await API.post(`/api/auth/verify/${userId}`, { otp });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'OTP verification failed'
      );
    }
  }
);
