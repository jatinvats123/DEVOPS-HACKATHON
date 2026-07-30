import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    /**
     * Required for local accounts, absent for Google ones.
     *
     * A Google-authenticated user has no password here by design. Storing a
     * random placeholder would be worse than storing nothing: it looks like a
     * credential, it would be accepted by any code path that only checks for
     * presence, and it makes "can this account sign in with a password?"
     * unanswerable.
     */
    password: {
      type: String,
      required: function () {
        return this.provider !== 'google';
      },
      minlength: 6,
      select: false,
    },

    /** How this account authenticates. */
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    /**
     * Google's stable subject identifier (the `sub` claim).
     *
     * Matched on in preference to the email address, because an email can be
     * changed or reassigned within a Google Workspace domain while `sub` never
     * moves. `sparse` so the unique index applies only to rows that have one —
     * without it every local account would collide on null.
     */
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    forgotPasswordToken: {
      type: String,
    },

    forgotPasswordExpire: {
      type: Date,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
    },

    otpExpire: {
      type: Date,
      default: function () {
        return Date.now() + 20 * 60 * 1000; // 20 minutes
      },
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    avatar: {
      type: String, // data URL (small, size-capped on upload)
      default: '',
    },

    preferences: {
      incidentAlerts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
      securityAlerts: { type: Boolean, default: true },
    },

    isBan: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  // A Google account has no password hash. bcrypt.compare throws outright when
  // the hash is undefined ("data and hash arguments required"), so without this
  // guard, trying to sign in to a Google account with a password returns a 500
  // instead of "invalid credentials" — and the 500 itself reveals that the
  // address belongs to a Google account.
  if (!this.password || !enteredPassword) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateOTP = async function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpire = Date.now() + 20 * 60 * 1000;
  await this.save({ validateBeforeSave: false });
  return otp;
};

/**
 * Issue a password-reset token.
 *
 * Returns the RAW token (which goes in the email) but stores only its SHA-256
 * hash. The token is a bearer credential: anyone holding it can take over the
 * account. Storing it verbatim meant a database dump — or any read-only leak,
 * an aggregation, a support tool, a log of a query — handed over every pending
 * reset. Hashing makes the stored value useless on its own.
 *
 * SHA-256 without a salt is the right choice here, unlike for passwords: the
 * token is 256 bits of CSPRNG output, so there is no dictionary to attack and
 * nothing for a salt to defend against. It also keeps the lookup a single
 * indexed equality match rather than a scan-and-compare over every user.
 */
export const hashResetToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

userSchema.methods.generateForgotToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.forgotPasswordToken = hashResetToken(token);
  this.forgotPasswordExpire = Date.now() + 15 * 60 * 1000;
  return token;
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      username: this.username,
    },
    config.JWT_SECRET,
    {
      expiresIn: `${config.JWT_EXPIRY}`,
    }
  );
};

export const User = mongoose.model('User', userSchema);
