import express from "express";

import protect from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminMiddleware.js";
import { uploadAfterPhoto } from "../middleware/uploadMiddleware.js";
import {
    listComplaints,
    getComplaintDetail,
    addStatusUpdate,
    overridePriority,
    resolveComplaint,
    getStats,
    getPriorityModel,
    retrainPriorityModel,
} from "../controllers/adminComplaintController.js";

// Mounted at /api/admin alongside the existing adminRoutes (profile).
// Every route is admin-only.
const router = express.Router();
const admin = [protect, adminOnly];

router.get("/complaints", admin, listComplaints);
router.get("/complaints/:id", admin, getComplaintDetail);
router.post("/complaints/:id/updates", admin, addStatusUpdate);
router.patch("/complaints/:id/priority", admin, overridePriority);
router.post("/complaints/:id/resolve", admin, uploadAfterPhoto, resolveComplaint);

router.get("/stats", admin, getStats);
router.get("/priority-model", admin, getPriorityModel);
router.post("/priority-model/retrain", admin, retrainPriorityModel);

export default router;
