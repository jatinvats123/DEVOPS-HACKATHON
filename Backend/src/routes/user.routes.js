import {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    updateProfile,
    verifyUser,
    forgotPassword,
    changePassword,
    resetPassword,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import express from "express";

const authRouter = express.Router();

/*
@route POST /api/auth/register
@desc Create a new User
@access Private
*/
authRouter.post("/register", registerUser);


/*
@route POST /api/auth/login
@desc Login a User
@access Private
*/
authRouter.post("/login", loginUser);


/*
@route POST /api/auth/logout
@desc Logout a User
@access Private
*/
authRouter.post("/logout", verifyJWT, logoutUser);


/*
@route POST /api/auth/verify/:id
@desc Verify a User
@access Private
*/
authRouter.post("/verify/:id", verifyUser);


/*
@route POST /api/auth/forgot-password
@desc Forgot a User password
@access Private
*/
authRouter.post("/forgot-password", forgotPassword);


/*
@route POST /api/auth/reset-password/:token
@desc Reset a User password
@access Private
*/
authRouter.post("/reset-password/:token", resetPassword);



/*
@route POST /api/auth/change-password
@desc Change a User password
@access Private
*/
authRouter.post("/change-password", verifyJWT, changePassword);


/*
@route GET /api/auth/profile
@desc Get a User profile
@access Private
*/
authRouter.get("/profile", verifyJWT, getUserProfile);

/*
@route PATCH /api/auth/profile
@desc Update avatar / notification preferences
@access Private
*/
authRouter.patch("/profile", verifyJWT, updateProfile);

export default authRouter;
