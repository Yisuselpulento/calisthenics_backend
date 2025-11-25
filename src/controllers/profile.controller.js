import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/uploadToCloudinary.js";


export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { peso, altura, country } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const updates = {};

    if (peso !== undefined) updates.peso = Number(peso);
    if (altura !== undefined) updates.altura = Number(altura);
    if (country !== undefined) updates.country = country;

    /* ---------------------- Avatar ---------------------- */
    if (req.files?.avatar) {
      // Borrar avatar anterior si existe
      if (user.avatar) await deleteFromCloudinary(user.avatar);

      const file = req.files.avatar[0];
      const result = await uploadToCloudinary(file, "avatars");
      updates.avatar = result.secure_url;
    }

    /* --------------------- Video Profile --------------------- */
    if (req.files?.videoProfile) {
      // Borrar video anterior si existe
      if (user.videoProfile) await deleteFromCloudinary(user.videoProfile);

      const file = req.files.videoProfile[0];
      const result = await uploadToCloudinary(file, "video_profiles");
      updates.videoProfile = result.secure_url;
    }

    /* ---------------------- Guardar ---------------------- */
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Perfil actualizado correctamente",
      user: updatedUser,
    });

  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};


export const updateAdvancedProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, email, password, country, profileType  } = req.body;

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
      if (existsEmail && existsEmail._id.toString() !== userId) {
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

    if (country) {
      updates.country = country;
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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select("-password");

    return res.json({
      success: true,
      message: "Perfil avanzado actualizado correctamente",
      user: updatedUser,
    });

  } catch (error) {
    console.error("updateAdvancedProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Error del servidor",
    });
  }
};
