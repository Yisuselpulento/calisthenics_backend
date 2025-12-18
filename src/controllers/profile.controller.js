import bcrypt from "bcryptjs";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import User from "../models/user.model.js";
import { UpdateFullUser } from "../utils/updateFullUser.js";
import { getAuthUser } from "../utils/getAuthUser.js";
import { cloudinaryFolder } from "../utils/cloudinaryFolder.js";

export const getProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("_id");

    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    const fullUser = await UpdateFullUser(user._id.toString(), req.userId);

    res.json({ success: true, user: fullUser });

  } catch (err) {
     console.error("getProfile by username error:", err);
    return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};


export const updateProfile = async (req, res) => {
  let avatarUpload = null;
  let videoUpload = null;

  try {
    const userId = req.userId;
    const { peso, altura, country } = req.body;

    if (!req.user?.username) {
  return res.status(400).json({
    success: false,
    message: "Username no disponible para subir archivos",
  });
}

    const user = await User.findById(userId);
    
    if (!user) {
  return res.status(404).json({
    success: false,
    message: "Usuario no encontrado",
  });
}

    const updates = {};

    /* ------------------ Datos básicos ------------------ */
    if (peso !== undefined) {
      const pesoNum = Number(peso);
      if (pesoNum < 0) {
        return res.status(400).json({ message: "Peso no puede ser negativo" });
      }
      updates.peso = pesoNum;
    }

    if (altura !== undefined) {
      const alturaNum = Number(altura);
      if (alturaNum < 0) {
        return res.status(400).json({ message: "Altura no puede ser negativa" });
      }
      updates.altura = alturaNum;
    }

    if (country !== undefined) {
      updates.country = country;
    }

    /* ---------------------- Avatar ---------------------- */
    if (req.files?.avatar?.[0]) {
      const file = req.files.avatar[0];

      avatarUpload = await uploadToCloudinary(
        file,
        cloudinaryFolder({
          username: req.user.username,
          type: "avatars",
        })
      );

      if (user.avatar?.publicId) {
        await deleteFromCloudinary(
          user.avatar.publicId,
          "image"
        );
      }

      updates.avatar = {
        url: avatarUpload.url,
        publicId: avatarUpload.publicId,
      };
    }

    /* ------------------ Video profile ------------------ */
    if (req.files?.videoProfile?.[0]) {
      const file = req.files.videoProfile[0];

      videoUpload = await uploadToCloudinary(
        file,
        cloudinaryFolder({
          username: req.user.username,
          type: "video_profile",
        })
      );

      if (user.videoProfile?.publicId) {
        await deleteFromCloudinary(
          user.videoProfile.publicId,
          "video"
        );
      }

      updates.videoProfile = {
        url: videoUpload.url,
        publicId: videoUpload.publicId,
      };
    }

    /* ---------------------- Guardar ---------------------- */
    await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select("-password");

    const authUser = await getAuthUser(userId);

    return res.json({
      success: true,
      message: "Perfil actualizado correctamente",
      user: authUser,
    });

  } catch (error) {
    if (avatarUpload?.publicId) {
      await deleteFromCloudinary(avatarUpload.publicId, "image");
    }
    if (videoUpload?.publicId) {
      await deleteFromCloudinary(videoUpload.publicId, "video");
    }
    console.error("updateProfile error:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};


export const updateAdvancedProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, email, password,  profileType  } = req.body;

   

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });

    const updates = {};
    let editedSomething = false;

    if (username) {
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({
          success: false,
          message: "Username inválido",
        });
      }

      if (username.length < 3 || username.length > 15) {
        return res.status(400).json({
          success: false,
          message: "El username debe tener entre 3 y 15 caracteres",
        });
      }

      const existsUsername = await User.findOne({ username });
      if (existsUsername && existsUsername._id.toString() !== userId) {
        return res.status(409).json({
          success: false,
          message: "El username ya está tomado",
        });
      }

      updates.username = username;
      editedSomething = true;
    }

    if (email) {
  const existsEmail = await User.findOne({ email });
  if (existsEmail && existsEmail._id.toString() !== user._id.toString()) {
    return res.status(409).json({
      success: false,
      message: "El email ya está registrado",
    });
  }

  updates.email = email;
  editedSomething = true;
}

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.password = hashed;
      editedSomething = true;
    }

    if (profileType) {
      if (!["static", "dynamic"].includes(profileType)) {
        return res.status(400).json({
          success: false,
          message: "profileType inválido. Usa: static | dynamic",
        });
      }

      updates.profileType = profileType;
      editedSomething = true;
    }

    if (editedSomething) {
      updates.lastEditAt = new Date();
    }

    await User.findByIdAndUpdate(userId, { $set: updates });

    // 🔥 Asegurar usuario COMPLETO con skills, combos, etc.
   const authUser = await getAuthUser(req.userId);

    return res.json({
      success: true,
      message: "Perfil avanzado actualizado correctamente",
      user: authUser,
    });

  } catch (error) {
    console.error("updateAdvancedProfile:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};
