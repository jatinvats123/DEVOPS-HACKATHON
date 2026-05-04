import { register ,login,getUserProfile,forgotPassword , changePassword, logout} from "../services/auth.api";
import { verifyOtp } from "../services/asyncThunk.api";
import { useDispatch } from "react-redux";
import { setLoading, setError, setUserId, setOtpSent ,setUser ,setAuthenticated} from "../state/authSlice";


export const useAuth = () => {
    const dispatch = useDispatch();

    // Registration handler
    const handleRegister = async (userData)=>{
        try{
            dispatch(setLoading(true));
            const response = await register(userData);
            // Backend returns { data: { user, token }, ... }
            if (response.data?.token) {
                dispatch(setUser(response.data.user));
                dispatch(setAuthenticated(true));
            }
            dispatch(setUserId(response.data?.user?._id));
            dispatch(setOtpSent(true));
            return response;
        }
        catch(err){
            const message = err.response?.data?.message || err.message || "Registration failed";
            dispatch(setError(message));
            throw err;
        }
        finally{
            dispatch(setLoading(false));
        }
    }


    // OTP verification handler
    const handleVerifyOtp = async (userId, otp) => {
        try {
            const response = await dispatch(verifyOtp({ userId, otp })).unwrap();
            return response;
        } catch (err) {
            dispatch(setError(err.message || "OTP verification failed"));
            throw err;
        } 
    }


    // Login handler
    const handleLogin = async (userData) => {
        try {
        dispatch(setLoading(true));
        const response = await login(userData);
        // Backend returns { data: { user, token }, ... }
        if (response.data?.token) {
            dispatch(setUser(response.data?.user));
            dispatch(setAuthenticated(true));
        }
        return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message || "Login failed";
            dispatch(setError(message));
            throw error;
        }finally{
            dispatch(setLoading(false));
        }
    }





    // Get user profile handler
    const handleGetUserProfile = async () => {
    try {
        dispatch(setLoading(true));
        const response = await getUserProfile();
        // Backend returns { data: user, ... } for profile
        dispatch(setUser(response.data));
        return response;
    } catch (error) {
        const message = error.response?.data?.message || error.message || "Failed to fetch user profile";
        dispatch(setError(message));
        throw error;
    }
    finally {
        dispatch(setLoading(false));
    }
    }


    // Forgot password handler
    const handleForgotPassword = async (email) => {
        try {
            dispatch(setLoading(true));
            const response = await forgotPassword(email);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message || "Failed to initiate forgot password process";
            dispatch(setError(message));
            throw error;
        } finally {
            dispatch(setLoading(false));
        }
    };


    const handleChangePassword = async (passwordData) => {
        try {
            dispatch(setLoading(true));
            const response = await changePassword(passwordData);
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.message || "Failed to change password";
            dispatch(setError(message));
            throw error;
        } finally {
            dispatch(setLoading(false));
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            dispatch(setUser(null));
            dispatch(setAuthenticated(false));
        }
    };

    return { handleRegister, handleVerifyOtp, handleLogin, handleGetUserProfile, handleForgotPassword, handleChangePassword, handleLogout };
}
