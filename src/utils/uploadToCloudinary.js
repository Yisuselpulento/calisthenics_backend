import cloudinary from "../config/cloudinary.js";
import imagekit from "../config/imagekit.js";

// Provider activo. Cambiar en el .env: "imagekit" o "cloudinary".
const PROVIDER = process.env.STORAGE_PROVIDER || "cloudinary";

/* ------------------------------------------------------------------ */
/*  Cloudinary                                                         */
/* ------------------------------------------------------------------ */
const uploadToCloudinaryImpl = (file, folder) => {
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

const deleteFromCloudinaryImpl = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (err) {
    console.error("Error eliminando archivo de Cloudinary:", err);
  }
};

/* ------------------------------------------------------------------ */
/*  ImageKit                                                           */
/* ------------------------------------------------------------------ */
const uploadToImageKitImpl = async (file, folder) => {
  if (!file) throw new Error("No file provided");

  const resourceType = file.mimetype.startsWith("video/") ? "video" : "image";

  const result = await imagekit.upload({
    file: file.buffer, // el SDK de Node acepta Buffer directamente
    fileName: file.originalname || `upload_${Date.now()}`,
    folder, // reutiliza cloudinaryFolder(): calistenia_app/<username>/<type>
    useUniqueFileName: true,
  });

  return {
    url: result.url,
    publicId: result.fileId, // en ImageKit el identificador para borrar es fileId
    resourceType,
  };
};

const deleteFromImageKitImpl = async (fileId) => {
  if (!fileId) return;
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    console.error("Error eliminando archivo de ImageKit:", err);
  }
};

/* ------------------------------------------------------------------ */
/*  API pública (mismo shape para ambos providers)                    */
/* ------------------------------------------------------------------ */

/**
 * 🔼 Subir archivo al provider activo.
 * @returns {Promise<{ url: string, publicId: string, resourceType: "image" | "video" }>}
 */
export const uploadToCloudinary = (file, folder) => {
  if (PROVIDER === "imagekit") return uploadToImageKitImpl(file, folder);
  return uploadToCloudinaryImpl(file, folder);
};

/**
 * 🗑️ Eliminar archivo del provider activo.
 * @param {String} publicId  public_id (Cloudinary) o fileId (ImageKit)
 * @param {"image" | "video"} resourceType  solo lo usa Cloudinary
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (PROVIDER === "imagekit") return deleteFromImageKitImpl(publicId);
  return deleteFromCloudinaryImpl(publicId, resourceType);
};
