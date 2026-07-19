import {
  register,
  login,
  logout,
  getUserProfile,
  forgotPassword,
  changePassword,
} from "../services/auth.api";
import { verifyOtp } from "../services/asyncThunk.api";
import { disconnectSocket } from "../../../lib/socket/socket";
import { useDispatch } from "react-redux";
import {
  setLoading,
  setError,
  setUserId,
  setOtpSent,
  setUser,
  setAuthenticated,
  clearAuthState,
} from "../state/authSlice";

// Extract a readable message from an axios error
const errMsg = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export const useAuth = () => {
  const dispatch = useDispatch();

  // Registration handler — backend returns ApiResponse { data: createdUser }
  const handleRegister = async (userData) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      const response = await register(userData);
      dispatch(setUserId(response?.data?._id));
      dispatch(setOtpSent(true));
      return response;
    } catch (err) {
      dispatch(setError(errMsg(err, "Registration failed")));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // OTP verification handler
  const handleVerifyOtp = async (userId, otp) => {
    const response = await dispatch(verifyOtp({ userId, otp })).unwrap();
    return response;
  };

  // Login handler — backend returns ApiResponse { data: { user } }
  const handleLogin = async (userData) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      const response = await login(userData);
      dispatch(setUser(response?.data?.user));
      dispatch(setAuthenticated(true));
      return response;
    } catch (err) {
      dispatch(setError(errMsg(err, "Login failed")));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      disconnectSocket();
      dispatch(clearAuthState());
    }
  };

  // Get user profile handler — backend returns ApiResponse { data: user }
  const handleGetUserProfile = async () => {
    const response = await getUserProfile();
    dispatch(setUser(response?.data));
    dispatch(setAuthenticated(true));
    return response;
  };

  // Forgot password handler
  const handleForgotPassword = async (email) => {
    try {
      dispatch(setLoading(true));
      return await forgotPassword(email);
    } catch (err) {
      dispatch(setError(errMsg(err, "Failed to send reset email")));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Change password handler
  const handleChangePassword = async (passwordData) => {
    try {
      dispatch(setLoading(true));
      return await changePassword(passwordData);
    } catch (err) {
      dispatch(setError(errMsg(err, "Failed to change password")));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  return {
    handleRegister,
    handleVerifyOtp,
    handleLogin,
    handleLogout,
    handleGetUserProfile,
    handleForgotPassword,
    handleChangePassword,
  };
};
