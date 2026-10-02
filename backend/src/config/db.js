import mongoose from "mongoose";
import env from "./env.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.mongoUri);

        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

export default connectDB;