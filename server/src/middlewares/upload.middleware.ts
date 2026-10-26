import fs from "node:fs";
import path from "node:path";
import multer from "multer";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

/** One picture, up to 10 MB. The extension comes from the checked mime type, never from the file name. */
export const uploadImage = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_request, file, callback) => {
      callback(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${EXTENSIONS[file.mimetype] ?? ".png"}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype in EXTENSIONS),
}).single("image");
