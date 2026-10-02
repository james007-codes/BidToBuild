import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const UPLOAD_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // Random name + extension derived from MIME type (never from the user's filename)
    filename: (req, file, cb) =>
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ALLOWED[file.mimetype]}`),
});

const imageUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED[file.mimetype]) return cb(null, true);
        const err = new Error("Only JPG, PNG or WEBP images are allowed");
        err.code = "INVALID_FILE_TYPE";
        cb(err);
    },
});

// Wraps multer so upload errors return clean 400 JSON instead of crashing the request
const handle = (middleware) => (req, res, next) =>
    middleware(req, res, (err) => {
        if (!err) return next();

        const messages = {
            LIMIT_FILE_SIZE: "Each image must be under 5 MB",
            LIMIT_FILE_COUNT: "You can upload at most 3 photos",
            LIMIT_UNEXPECTED_FILE: `Unexpected file field "${err.field}"`,
        };

        return res.status(400).json({
            success: false,
            message: messages[err.code] || err.message || "Upload failed",
        });
    });

export const uploadComplaintPhotos = handle(imageUpload.array("photos", 3));
export const uploadAfterPhoto = handle(imageUpload.single("afterPhoto"));

// Build the public URL for a saved file
export const fileUrl = (req, file) =>
    `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

// Remove files from a failed request so orphan uploads don't pile up
export const cleanupFiles = (files = []) => {
    for (const f of files) fs.unlink(f.path, () => {});
};
