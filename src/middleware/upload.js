import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
  fileFilter(req, file, cb) {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes o videos"));
    }
  },
});
