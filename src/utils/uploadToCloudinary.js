import cloudinary from "../config/cloudinary.js";

/**
 * 🔼 Subir archivo a Cloudinary
 * @param {Object} file - archivo de multer (memoryStorage)
 * @param {String} folder - carpeta en Cloudinary
 * @returns {Promise<{ url: string, publicId: string, resourceType: "image" | "video" }>}
 */
export const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided"));

    const resourceType = file.mimetype.startsWith("video/")
      ? "video"
      : "image";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        type: "upload",
        access_mode: "public",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * 🗑️ Eliminar archivo de Cloudinary usando public_id
 * @param {String} publicId
 * @param {"image" | "video"} resourceType
 */
export const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (err) {
    console.error("Error eliminando archivo de Cloudinary:", err);
  }
};
