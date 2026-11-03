import multer from "multer";

/** 8 MB is the largest allowed file (images); PDFs are further limited to 5 MB in MediaService. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Files are kept in memory: they are validated and re-encoded before anything touches the disk. */
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5, fieldSize: 2048 },
}).single("file");
