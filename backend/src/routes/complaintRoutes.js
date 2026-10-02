import express from "express";

import protect from "../middleware/authMiddleware.js";
import { uploadComplaintPhotos } from "../middleware/uploadMiddleware.js";
import {
    getComplaintConfig,
    previewPriority,
    createComplaint,
    getMyComplaints,
    getMyComplaint,
} from "../controllers/complaintController.js";

const router = express.Router();

router.get("/config", protect, getComplaintConfig);
router.post("/preview", protect, previewPriority);
router.post("/", protect, uploadComplaintPhotos, createComplaint);
router.get("/mine", protect, getMyComplaints);
router.get("/:id", protect, getMyComplaint);

export default router;
