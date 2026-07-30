import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/user.model.js';
import { UserService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/config.js';
import logger from '../config/logger.js';

/**
 * Sign in with Google (Google Identity Services).
 *
 * The browser obtains a signed ID token from Google and posts it here; this
 * endpoint verifies it and, if it holds up, issues the same session cookie the
 * password login issues. No Google token is ever stored — it is a proof of
 * identity for one moment, not a credential we need to keep.
 *
 * Verification is done with google-auth-library rather than by decoding the
 * JWT ourselves. An unverified decode of an attacker-supplied token is exactly
 * how this integration gets broken: the payload is trivially forgeable, and the
 * only thing that makes it trustworthy is checking Google's signature against
 * Google's published keys — plus the issuer and audience claims below.
 */

/**
 * Lazily constructed, so the module can be imported (and the rest of the app
 * can boot) on a deployment with no Google configuration at all.
 */
let client = null;
const googleClient = () => {
  if (!client) client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
  return client;
};

/** Google's own issuer values. Anything else is not a Google token. */
const VALID_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
]);

/** Build a unique, schema-legal username from a Google profile. */
async function allocateUsername(email) {
  const base =
    String(email)
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'user';
  // The schema requires >= 3 characters; a short mailbox name would fail
  // validation and surface as a 500 on an otherwise valid sign-in.
  const seed = base.length >= 3 ? base : `${base}user`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? seed : `${seed}${attempt}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  // Exhausting twenty variants means the name is genuinely contested; fall back
  // to something collision-proof rather than failing the sign-in.
  return `${seed}${Date.now().toString(36)}`;
}

export const googleAuth = asyncHandler(async (req, res) => {
  if (!config.GOOGLE_CLIENT_ID) {
    // 501, not 500: the request is well-formed, the deployment simply has no
    // Google configuration. The frontend hides the button in this case, so
    // reaching here means someone called the API directly.
    throw new ApiError(501, 'Google sign-in is not configured on this server');
  }

  const { credential } = req.body;
  if (!credential || typeof credential !== 'string') {
    throw new ApiError(400, 'Google credential is required');
  }

  let payload;
  try {
    const ticket = await googleClient().verifyIdToken({
      idToken: credential,
      // The audience check is the crux. Without it, a token minted for ANY
      // Google application would be accepted here — an attacker can obtain a
      // valid Google ID token from their own app and replay it against ours.
      audience: config.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    // Expired, malformed, wrong audience, bad signature — all the same answer.
    // Distinguishing them tells someone probing exactly how far they got.
    logger.warn(`[auth] Google credential rejected: ${err.message}`);
    throw new ApiError(401, 'Google sign-in failed. Please try again.');
  }

  if (!payload || !VALID_ISSUERS.has(payload.iss)) {
    throw new ApiError(401, 'Google sign-in failed. Please try again.');
  }

  /**
   * An unverified email must not be trusted.
   *
   * Google will issue a token for an address the account has not proven it
   * controls. Accepting one lets somebody sign up as
   * victim@company.com and — through the email match below — take over an
   * existing local account.
   */
  if (!payload.email || payload.email_verified !== true) {
    throw new ApiError(
      401,
      'Your Google account does not have a verified email address'
    );
  }

  const email = String(payload.email).toLowerCase();

  // Match on `sub` first: it is Google's stable identifier and survives the
  // user changing their email address.
  let user = await User.findOne({ googleId: payload.sub });

  if (!user) {
    const byEmail = await User.findOne({ email });

    if (byEmail) {
      /**
       * An existing local account with the same, Google-verified address.
       *
       * Linking is safe specifically BECAUSE Google asserted email_verified
       * above: whoever completed this flow demonstrably controls the mailbox
       * that owns the account. The password is left untouched, so the user
       * keeps both ways in.
       */
      byEmail.googleId = payload.sub;
      byEmail.isVerified = true;
      if (!byEmail.avatar && payload.picture) byEmail.avatar = payload.picture;
      await UserService.saveUser(byEmail, { validateBeforeSave: false });
      user = byEmail;
    } else {
      user = await User.create({
        username: await allocateUsername(email),
        fullname: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        provider: 'google',
        avatar: payload.picture,
        // Google has already verified the address; requiring our own OTP on top
        // would be asking the user to prove something we were just told.
        isVerified: true,
      });
    }
  }

  const accessToken = user.generateAccessToken();
  const safeUser = await UserService.findUserByIdWithoutPassword(user._id);

  // Identical cookie options to the password login — one session mechanism,
  // not two.
  res.cookie(config.AUTH_COOKIE, accessToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: safeUser, token: accessToken },
        'Signed in with Google successfully'
      )
    );
});

export default googleAuth;
