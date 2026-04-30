import { User } from "../models/user.model.js";

export const UserService = {
    findUserByEmailOrUsername: async (email, username) => {
        return await User.findOne({
            $or: [{ username }, { email }]
        }).select("+password");
    },

    createUser: async (payload) => {
        return await User.create(payload);
    },

    findUserByIdWithoutPassword: async (id) => {
        return await User.findById(id);
    },

    findUserByIdWithPassword: async (id) => {
        return await User.findById(id).select("+password");
    },

    findUserById: async (id) => {
        return await User.findById(id);
    },

    findUserByEmail: async (email) => {
        return await User.findOne({ email });
    },

    findUserByForgotToken: async (token) => {
        return await User.findOne({
            forgotPasswordToken: token,
            forgotPasswordExpire: { $gt: Date.now() }
        });
    },

    saveUser: async (user, options = {}) => {
        return await user.save(options);
    }
};
