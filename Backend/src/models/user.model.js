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

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
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
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateOTP = async function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpire = Date.now() + 20 * 60 * 1000;
  await this.save({ validateBeforeSave: false });
  return otp;
};

userSchema.methods.generateForgotToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.forgotPasswordToken = token;
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
