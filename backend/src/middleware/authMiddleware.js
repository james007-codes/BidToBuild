import jwt from "jsonwebtoken";
import env from "../config/env.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.jwtSecret);

        let account;

        if (decoded.role === "user") {
            account = await User.findById(decoded.id).select("-password");
        } else if (decoded.role === "admin") {
            account = await Admin.findById(decoded.id).select("-password");
        }

        if (!account) {
            return res.status(401).json({
                success: false,
                message: "Account not found",
            });
        }

        req.account = account;
        req.role = decoded.role;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

export default protect;