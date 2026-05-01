//backend url and api endpoints 
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// register API endpoints
const REGISTER_API = import.meta.env.VITE_REGISTER_API;


// login API endpoints
const LOGIN_API = import.meta.env.VITE_LOGIN_API;


//get user profile API endpoint
const GET_USER_API = import.meta.env.VITE_GET_USER_API;


// Validate environment variables
if(!BACKEND_URL) {
    throw new Error("BACKEND_URL is not defined in the environment variables");
}


if(!REGISTER_API) {
    throw new Error("REGISTER_API is not defined in the environment variables");
}


if(!LOGIN_API) {
    throw new Error("LOGIN_API is not defined in the environment variables");
}


if(!GET_USER_API) {
    throw new Error("GET_USER_API is not defined in the environment variables");
}

// Export the environment variables as a config object
export const env = {
    BACKEND_URL,
    REGISTER_API,
    LOGIN_API,
    GET_USER_API
}