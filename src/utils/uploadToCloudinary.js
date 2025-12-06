import cloudinary from "../config/cloudinary.js";

export const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const resourceType = file.mimetype.startsWith("video/")
      ? "video"
      : "image";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const buffer = Buffer.isBuffer(file.buffer)
      ? file.buffer
      : Buffer.from(file.buffer);

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (url) => {
  if (!url) return;

  try {
    const parts = url.split("/");
    const file = parts.pop();
    const folder = parts.pop();
    const publicId = `${folder}/${file.split(".")[0]}`;

 
    const isVideo =
      url.includes("video") ||
      file.endsWith(".mp4") ||
      file.endsWith(".mov") ||
      file.endsWith(".avi");

    await cloudinary.uploader.destroy(publicId, {
      resource_type: isVideo ? "video" : "image",
    });

  } catch (err) {
    console.error("Error eliminando archivo de Cloudinary:", err);
  }
};