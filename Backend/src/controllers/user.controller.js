import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { UserService } from '../services/user.service.js';
import { sendEmail } from '../services/sendEmail.js';
import { config, frontendUrlIsLoopback } from '../config/config.js';
import logger from '../config/logger.js';

/**
 * Send a NON-CRITICAL notification email without letting it fail the operation
 * that triggered it.
 *
 * Two bugs this replaces:
 *  - `verifyUser` awaited sendEmail directly, so an SMTP outage returned 500 to
 *    a user whose account had in fact just been verified — the write had
 *    already committed. They would retry, be told they are already verified,
 *    and reasonably conclude the product is broken.
 *  - `forgotPassword` called sendEmail with NO await at all: a floating promise
 *    whose rejection surfaced as an unhandled rejection, which on Node 15+
 *    terminates the process by default. An unreachable SMTP host could take the
 *    API down.
 *
 * Delivery is best effort; the state change is the contract.
 */
async function sendNotificationEmail(options, context) {
  try {
    await sendEmail(options);
  } catch (err) {
    logger.error(`[auth] ${context} email failed: ${err.message}`);
  }
}

export const registerUser = asyncHandler(async (req, res) => {
  // NOTE: a `console.log(req.body)` used to sit here, writing every new user's
  // PLAINTEXT PASSWORD to stdout — and therefore into whatever log aggregator
  // the platform ships to, where it is retained and searchable. Never log a
  // request body on a credential endpoint.
  const { username, email, fullname, password } = req.body;

  const existedUser = await UserService.findUserByEmailOrUsername(
    email,
    username
  );

  if (existedUser) {
    throw new ApiError(409, 'User with email or username already exists');
  }

  const user = await UserService.createUser({
    fullname,
    email,
    password,
    username: username.toLowerCase(),
  });

  // Verification bypass is now an explicit deployment decision rather than a
  // hardcoded line with a "remove in production" comment beside it. Defaults to
  // on so existing deployments are unaffected; set AUTO_VERIFY_USERS=false to
  // require the OTP flow. Documented as an accepted risk in SECURITY.md.
  if (config.AUTO_VERIFY_USERS) {
    user.isVerified = true;
    await user.save();
  }

  const createdUser = await UserService.findUserByIdWithoutPassword(user._id);
  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering the user');
  }

  // Skip OTP and email for development
  const accessToken = user.generateAccessToken();
  const options = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(201)
    .cookie(config.AUTH_COOKIE, accessToken, options)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, token: accessToken },
        'User registered successfully'
      )
    );
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, 'username or email is required');
  }

  const user = await UserService.findUserByEmailOrUsername(email, username);

  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  if (!user.isVerified) {
    throw new ApiError(
      401,
      'User is not verified. Please verify your email first.'
    );
  }

  const accessToken = user.generateAccessToken();

  const loggedInUser = await UserService.findUserByIdWithoutPassword(user._id);

  const options = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
  };
  res.cookie(config.AUTH_COOKIE, accessToken, options);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, token: accessToken },
        'User logged in successfully'
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  const options = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
  };
  return res
    .status(200)
    .clearCookie(config.AUTH_COOKIE, options)
    .json(new ApiResponse(200, {}, 'User logged out'));
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const userid = req.user.id;
  const user = await UserService.findUserById(userid);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, 'User profile retrieved successfully'));
});

export const verifyUser = asyncHandler(async (req, res) => {
  const userid = req.params.id;
  const { otp } = req.body;

  const user = await UserService.findUserById(userid);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isVerified) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, 'User is already verified'));
  }

  if (user.otp !== otp || user.otpExpire < Date.now()) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpire = undefined;
  await UserService.saveUser(user, { validateBeforeSave: false });
  await sendNotificationEmail(
    {
      email: user.email,
      subject: 'User Verified',
      message: `Your account has been verified successfully.`,
    },
    'verification confirmation'
  );
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'User verified successfully'));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !String(email).trim()) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await UserService.findUserByEmail(String(email).trim());

  /**
   * A missing account is NOT an error here.
   *
   * This used to throw 404 "User not found" directly beneath a comment saying
   * the endpoint always returns 200 — the comment described the intent, the
   * code did the opposite. The 404 made the endpoint an account-enumeration
   * oracle: post an address, learn from the status code whether it is
   * registered, repeat down a breach list to find which of your users have
   * accounts here.
   *
   * The response is now identical either way. Work that only makes sense for a
   * real account simply does not happen.
   */
  if (user) {
    const resetToken = user.generateForgotToken();
    await UserService.saveUser(user, { validateBeforeSave: false });

    /**
     * The link must point at the SPA, not at this API.
     *
     * It previously pointed to `/api/auth/reset-password/:token`, which exists
     * only as a POST route. Clicking it in a mail client issues a GET, which
     * matched no API route and fell through to the SPA shell — so the flow was
     * unusable from the one place it is ever used from. The token now travels
     * to a real page that can collect a new password and POST it back.
     *
     * Built from configured FRONTEND_URL rather than the request's Host header:
     * Host is attacker-controlled, and reflecting it into a password-reset link
     * lets someone request a reset for your address and have the token
     * delivered to a host they chose.
     */
    const resetUrl = `${config.FRONTEND_URL.replace(/\/+$/, '')}/reset-password/${resetToken}`;

    /**
     * A loopback link works only on the machine that generated it.
     *
     * Production refuses to boot with a loopback FRONTEND_URL, so reaching here
     * means local development — where it is entirely legitimate, right up until
     * the recipient is a real address rather than the developer's own browser.
     * Real reset mail was sent to a real inbox pointing at localhost:5173 and
     * failed with "This site can't be reached", which says nothing about why.
     *
     * Logged with the actual URL so the reset can still be completed by pasting
     * it, and so the cause is visible at the moment it happens.
     */
    if (frontendUrlIsLoopback) {
      logger.warn(
        `[auth] reset link points at a loopback address and will not open on any ` +
          `other device: ${resetUrl}`
      );
    }

    await sendNotificationEmail(
      {
        email: user.email,
        subject: 'Reset your WatchTower password',
        message: `You requested a password reset. Open this link to choose a new password (valid for 15 minutes): ${resetUrl}\n\nIf you did not request this, you can ignore this email — your password has not changed.`,
        html: `
          <p>You requested a password reset for your WatchTower account.</p>
          <p><a href="${resetUrl}">Choose a new password</a></p>
          <p>This link is valid for <strong>15 minutes</strong> and can be used once.</p>
          <p>If you did not request this, you can ignore this email — your password has not changed.</p>
          <p style="color:#6c6a64;font-size:12px">If the link does not open, paste this into your browser:<br>${resetUrl}</p>`,
      },
      'password reset'
    );
  }

  // Always 200, even if delivery failed: reporting the difference would turn
  // this endpoint into an account-enumeration oracle.
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'If an account exists for that email, a reset link has been sent.'
      )
    );
});

export const changePassword = asyncHandler(async (req, res) => {
  const userid = req.user.id;
  const user = await UserService.findUserByIdWithPassword(userid);
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(401, 'Invalid password');
  }
  const ispassword = await user.comparePassword(oldPassword);
  if (!ispassword) {
    throw new ApiError(401, 'Invalid password');
  }
  user.password = newPassword;
  await UserService.saveUser(user);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    throw new ApiError(400, 'New password is required');
  }

  // Same floor the registration validator enforces. Without it this endpoint
  // was a way to set a one-character password on an existing account, quietly
  // undoing the rule applied at sign-up.
  if (String(newPassword).length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }

  const user = await UserService.findUserByForgotToken(token);

  // One message for "no such token" and "expired token" alike: distinguishing
  // them tells someone probing tokens which guesses were structurally right.
  if (!user) {
    throw new ApiError(400, 'This reset link is invalid or has expired');
  }

  user.password = newPassword;

  // Consume the token. `$unset` via undefined leaves nothing to match, and
  // clearing the expiry means even a stored-hash collision could not satisfy
  // the `expire > now` half of the lookup. A reset link must work exactly once
  // — it has travelled through email and may sit in an inbox indefinitely.
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpire = undefined;
  await UserService.saveUser(user);

  // Tell the account holder out of band. If they did not do this, this mail is
  // the only signal that someone else holds their mailbox.
  await sendNotificationEmail(
    {
      email: user.email,
      subject: 'Your WatchTower password was changed',
      message:
        'Your WatchTower password was just reset. If this was not you, contact support immediately.',
      html: `<p>Your WatchTower password was just reset.</p>
             <p>If this was not you, someone else may have access to your email account — contact support immediately.</p>`,
    },
    'password reset confirmation'
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'Password reset successfully. You can now sign in with your new password.'
      )
    );
});
// Update avatar and/or notification preferences for the signed-in user
export const updateProfile = asyncHandler(async (req, res) => {
  const { avatar, preferences } = req.body;
  const update = {};

  if (typeof avatar === 'string') {
    if (avatar && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatar)) {
      throw new ApiError(400, 'Avatar must be a PNG, JPG, WEBP or GIF image');
    }
    // ~800KB of raw image is ~1.1MB once base64-encoded
    if (avatar.length > 1_200_000) {
      throw new ApiError(400, 'Avatar is too large. Max size is 800KB.');
    }
    update.avatar = avatar;
  }

  if (preferences && typeof preferences === 'object') {
    for (const key of ['incidentAlerts', 'weeklyDigest', 'securityAlerts']) {
      if (typeof preferences[key] === 'boolean') {
        update[`preferences.${key}`] = preferences[key];
      }
    }
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, 'Nothing to update');
  }

  const user = await UserService.findUserById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const updated = await user.constructor.findByIdAndUpdate(
    req.user.id,
    { $set: update },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updated, 'Profile updated successfully'));
});
