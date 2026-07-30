import { User, hashResetToken } from '../models/user.model.js';

export const UserService = {
  findUserByEmailOrUsername: async (email, username) => {
    return await User.findOne({
      $or: [{ username }, { email }],
    }).select('+password');
  },

  createUser: async (payload) => {
    return await User.create(payload);
  },

  findUserByIdWithoutPassword: async (id) => {
    return await User.findById(id);
  },

  findUserByIdWithPassword: async (id) => {
    return await User.findById(id).select('+password');
  },

  findUserById: async (id) => {
    return await User.findById(id);
  },

  findUserByEmail: async (email) => {
    return await User.findOne({ email });
  },

  /**
   * Look up a pending reset by the RAW token from the email link.
   *
   * Only the hash is stored, so the incoming token is hashed to match. The
   * expiry is part of the query rather than a check afterwards: an expired row
   * must not be a hit at all, or every "is it still valid?" branch downstream
   * becomes another chance to forget one.
   *
   * `+password` because resetPassword assigns to `user.password`, and the field
   * is `select: false`. Without it Mongoose has no original value to compare
   * against, `isModified('password')` is unreliable, and the pre-save hook that
   * hashes the new password can be skipped — storing it in plaintext.
   */
  findUserByForgotToken: async (token) => {
    if (!token) return null;
    return await User.findOne({
      forgotPasswordToken: hashResetToken(token),
      forgotPasswordExpire: { $gt: Date.now() },
    }).select('+password');
  },

  saveUser: async (user, options = {}) => {
    return await user.save(options);
  },
};
