
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { UserService } from "../services/user.service.js";
import { sendEmail } from "../services/sendEmail.js";
import { config } from "../config/config.js";

export const registerUser = asyncHandler(async (req, res) => {
    console.log(req.body)
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

    // Auto-verify user for development (remove in production)
    user.isVerified = true;
    await user.save();

    const createdUser = await UserService.findUserByIdWithoutPassword(user._id);
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Skip OTP and email for development
    const accessToken = user.generateAccessToken();
    const options = {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict"
    };

    return res
        .status(201)
        .cookie("uptimeaitoken", accessToken, options)
        .json(
            new ApiResponse(201, { user: createdUser, token: accessToken }, "User registered successfully")
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
    res.cookie("uptimeaitoken", accessToken, options)
    return res
        .status(200)
        .json(
            new ApiResponse(200, { user: loggedInUser, token: accessToken }, "User logged in successfully")
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
        .clearCookie("uptimeaitoken", options)
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

    const resetUrl = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`;
    sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message: `You requested a password reset. Please use the following token to reset your POST to: ${resetUrl}`,
    })
    return res.status(200).json(
        new ApiResponse(200, {}, "Password reset token sent to email")
    );
});

export const changePassword = asyncHandler(async (req, res) => {
    const userid = req.user.id
    const user = await UserService.findUserByIdWithPassword(userid);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new ApiError(401, "Invalid password")
    }
    const ispassword = await user.comparePassword(currentPassword);
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