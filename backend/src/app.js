import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import adminComplaintRoutes from "./routes/adminComplaintRoutes.js";
import { UPLOAD_DIR } from "./middleware/uploadMiddleware.js";

const app = express();
app.use(
    cors({
        // Any local dev port (Vite moves to 5174+ when 5173 is busy)
        origin: /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
        credentials: true,
    })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/conversations",conversationRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminComplaintRoutes);

// Uploaded complaint photos (served read-only)
app.use("/uploads", express.static(UPLOAD_DIR, { index: false, dotfiles: "deny" }));

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Hackathon backend API is running",
    });
});

export default app;