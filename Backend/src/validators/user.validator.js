import { z } from "zod";
import { validateRequest } from "../config/validate.js";

export const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(30),
    email: z.string().email("Invalid email address"),
    fullname: z.string().min(3, "Full name must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    validateRequest
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address").optional(),
    username: z.string().optional(),
    password: z.string().min(1, "Password is required"),
}).refine(data => data.email || data.username, {
    message: "Either email or username is required",
    path: ["email"],
    validateRequest
});

export const verifyUserSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 digits"),
    userId: z.string().min(1, "User ID is required"),
    validateRequest
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
    validateRequest
});

export const changePasswordSchema = z.object({
    oldPassword: z.string().optional(),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    token: z.string().optional(), // In case it's a reset via token
}).refine(data => data.oldPassword || data.token, {
    message: "Either old password or a reset token must be provided",
    path: ["oldPassword"],
    validateRequest
});
