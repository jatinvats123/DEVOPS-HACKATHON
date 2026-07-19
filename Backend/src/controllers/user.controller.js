
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { UserService } from "../services/user.service.js";
import { sendEmail } from "../services/sendEmail.js";
import { config } from "../config/config.js";

export const registerUser = asyncHandler(async (req, res) => {
    const { username, email, fullname, password } = req.body;

    const existedUser = await UserService.findUserByEmailOrUsername(email, username);

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const user = await UserService.createUser({
        fullname,
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await UserService.findUserByIdWithoutPassword(user._id);
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }
    await user.generateOTP();

    try {
        await sendEmail({
            email: user.email,
            subject: "OTP Verification",
            message: `Your OTP is: ${user.otp}`
        });
    } catch (error) {
        console.error("Failed to send OTP email:", error.message);
    }
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully. Please verify your email with the OTP.")
    );
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await UserService.findUserByEmailOrUsername(email, username);

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    if (!user.isVerified) {
        throw new ApiError(401, "User is not verified. Please verify your email first.");
    }

    const accessToken = user.generateAccessToken();

    const loggedInUser = await UserService.findUserByIdWithoutPassword(user._id);

    const options = {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict"
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, { user: loggedInUser }, "User logged in successfully")
        );
});

export const logoutUser = asyncHandler(async (req, res) => {
    const options = {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict"
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

export const getUserProfile = asyncHandler(async (req, res) => {
    const userid = req.user.id;
    const user = await UserService.findUserById(userid);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res.status(200).json(
        new ApiResponse(200, user, "User profile retrieved successfully")
    );
});

export const verifyUser = asyncHandler(async (req, res) => {
    const userid = req.params.id;
    const { otp } = req.body;

    const user = await UserService.findUserById(userid);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
        return res.status(400).json(new ApiResponse(400, {}, "User is already verified"));
    }

    if (user.otp !== otp || user.otpExpire < Date.now()) {
        throw new ApiError(400, "Invalid or expired OTP");
    }
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await UserService.saveUser(user, { validateBeforeSave: false });
    await sendEmail({
        email: user.email,
        subject: "User Verified",
        message: `Your account has been verified successfully.`
    })
    return res.status(200).json(
        new ApiResponse(200, {}, "User verified successfully")
    );
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await UserService.findUserByEmail(email);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const resetToken = user.generateForgotToken();
    await UserService.saveUser(user, { validateBeforeSave: false });

    // Link to the FRONTEND reset page (not the API route) so the user lands
    // on a form they can actually use.
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
    try {
        await sendEmail({
            email: user.email,
            subject: "Password Reset Request",
            html: `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      <tr><td style="background:#111827;color:#fff;padding:20px;text-align:center;"><h2 style="margin:0;">Reset your password</h2></td></tr>
      <tr><td style="padding:24px;color:#333;">
        <p>Hello <strong>${user.username || "there"}</strong>,</p>
        <p>We received a request to reset your WatchTower password. This link is valid for 15 minutes.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${resetUrl}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block;">Reset password</a>
        </p>
        <p style="font-size:13px;color:#666;">If the button doesn't work, paste this into your browser:<br/><span style="color:#4f46e5;">${resetUrl}</span></p>
        <p style="font-size:13px;color:#666;">If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
    </table></td></tr></table></body></html>`,
        });
    } catch (error) {
        console.error("Failed to send reset email:", error.message);
    }
    return res.status(200).json(
        new ApiResponse(200, {}, "Password reset link sent to email")
    );
});

export const changePassword = asyncHandler(async (req, res) => {
    const userid = req.user.id
    const user = await UserService.findUserByIdWithPassword(userid);
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(401, "Invalid password")
    }
    const ispassword = await user.comparePassword(oldPassword);
    if (!ispassword) {
        throw new ApiError(401, "Invalid password")
    }
    user.password = newPassword;
    await UserService.saveUser(user);

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        throw new ApiError(400, "New password is required");
    }

    const user = await UserService.findUserByForgotToken(token);

    if (!user) {
        throw new ApiError(400, "Invalid or expired reset token");
    }

    user.password = newPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpire = undefined;
    await UserService.saveUser(user);

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});