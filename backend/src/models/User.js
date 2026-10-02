import mongoose from "mongoose";
import config from "../config/complaintConfig.js";

const userSchema = new mongoose.Schema(
    {
        name: {
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
        },

        // Chosen once at sign-up; every complaint inherits them
        userType: {
            type: String,
            enum: config.userTypes,
            default: "Student",
        },

        department: {
            type: String,
            enum: [...config.departments.map((d) => d.id), null],
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;
