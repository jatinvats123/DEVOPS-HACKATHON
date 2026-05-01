import { register ,login,getUserProfile} from "../services/auth.api";
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
            dispatch(setUserId(response.userId));
            dispatch(setOtpSent(true));
            return response;
        }
        catch(err){
            dispatch(setError(err.message || "Registration failed"));
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
        dispatch(setUser(response.user));
        dispatch(setAuthenticated(true));
        return response;
        } catch (error) {
            dispatch(setError(error.message || "Login failed"));
        }finally{
            dispatch(setLoading(false));
        }
    }


    // Get user profile handler
    const handleGetUserProfile = async () => {
    try {
        dispatch(setLoading(true));
        const response = await getUserProfile();
        dispatch(setUser(response.user));
        return response;
    } catch (error) {
        dispatch(setError(error.message || "Failed to fetch user profile"));
    }
    finally {
        dispatch(setLoading(false));
    }
    }

    return { handleRegister, handleVerifyOtp, handleLogin, handleGetUserProfile };
}
