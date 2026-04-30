import {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    verifyUser,
    forgotPassword,
    changePassword,
    resetPassword,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import express from "express";

const authRouter = express.Router();

// Unsecured routes
authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", verifyJWT, logoutUser);
authRouter.post("/verify/:id", verifyUser);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password/:token", resetPassword);
authRouter.post("/change-password", verifyJWT, changePassword);
authRouter.get("/profile", verifyJWT, getUserProfile);

export default authRouter;
