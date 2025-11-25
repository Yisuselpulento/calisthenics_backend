import UserSkill from "../models/userSkill.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";
import User from "../models/user.model.js";
import Skill from "../models/skill.model.js";

// -------------------- Agregar Variante --------------------
export const addSkillVariant = async (req, res) => {
  try {
    const userId = req.userId;
    const { skillId, variantKey, fingers = 5 } = req.body;

    if (!skillId || !variantKey || ![1, 2, 5].includes(Number(fingers))) {
      return res.status(400).json({ success: false, message: "Faltan datos o fingers inválido" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "El video es obligatorio" });
    }

    let userSkill = await UserSkill.findOne({ user: userId, skill: skillId });

    if (!userSkill) {
      userSkill = new UserSkill({ user: userId, skill: skillId, variants: [] });
    }

    const exists = userSkill.variants.some(
      (v) => v.variantKey === variantKey && v.fingers === Number(fingers)
    );

    if (exists) {
      return res.status(400).json({ success: false, message: "Ya tienes esa variante con esos dedos" });
    }

    // Subir video
    const result = await uploadToCloudinary(req.file, "user_skill_videos", "video");

    userSkill.variants.push({ variantKey, fingers: Number(fingers), video: result.secure_url });

    await userSkill.save();

    await User.findByIdAndUpdate(
        userId,
        { $addToSet: { skills: userSkill._id } }, 
        { new: true }
        );

    res.json({ success: true, message: "Variante agregada correctamente", userSkill });
  } catch (err) {
    console.error("addSkillVariant:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

// -------------------- Editar Variante --------------------
export const editSkillVariant = async (req, res) => {
  try {
    const userId = req.userId;
    const { userSkillId, variantKey, fingers } = req.params; // actuales
    const { newVariantKey, newFingers } = req.body; // nuevos

    const userSkill = await UserSkill.findOne({
      _id: userSkillId,
      user: userId,
    });

    if (!userSkill)
      return res
        .status(404)
        .json({ success: false, message: "Skill no encontrada" });

    const variantIndex = userSkill.variants.findIndex(
      (v) =>
        v.variantKey === variantKey && v.fingers === Number(fingers)
    );

    if (variantIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "Variante no encontrada" });

    const variant = userSkill.variants[variantIndex];

    // ----------- Validar newFingers -----------
    if (newFingers !== undefined) {
      const nf = Number(newFingers);
      if (![1, 2, 5].includes(nf)) {
        return res.status(400).json({
          success: false,
          message: "Los fingers deben ser 1, 2 o 5",
        });
      }

      // Verificar que no exista otra variante con same newFingers + same variantKey
      const exists = userSkill.variants.some(
        (v, i) =>
          i !== variantIndex &&
          v.variantKey === (newVariantKey || variant.variantKey) &&
          v.fingers === nf
      );
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Ya existe una variante con esos dedos y esa key",
        });
      }

      variant.fingers = nf;
    }

    // ----------- Cambiar variantKey -----------
    if (newVariantKey) {
      const exists = userSkill.variants.some(
        (v, i) =>
          i !== variantIndex &&
          v.variantKey === newVariantKey &&
          v.fingers === (newFingers || variant.fingers)
      );
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Ya existe una variante con esa combination variantKey + fingers",
        });
      }

      variant.variantKey = newVariantKey;
    }

    // ----------- Reemplazar video -----------
    if (req.file) {
      if (variant.video) await deleteFromCloudinary(variant.video);
      const result = await uploadToCloudinary(
        req.file,
        "user_skill_videos",
        "video"
      );
      variant.video = result.secure_url;
    }

    await userSkill.save();

    res.json({
      success: true,
      message: "Variante actualizada correctamente",
      userSkill,
    });
  } catch (err) {
    console.error("editSkillVariant:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};


// -------------------- Eliminar Variante --------------------
export const deleteSkillVariant = async (req, res) => {
  try {
    const { userSkillId, variantKey, fingers } = req.params;

    const userId = req.userId;

    const userSkill = await UserSkill.findOne({
      _id: userSkillId,
      user: userId,
    });

    if (!userSkill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada",
      });
    }

    const variantIndex = userSkill.variants.findIndex(
      (v) =>
        v.variantKey === variantKey &&
        v.fingers === Number(fingers)
    );

    if (variantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    const removedVariant = userSkill.variants[variantIndex];

    // Eliminar video de Cloudinary si existe
    if (removedVariant.video) {
      await deleteFromCloudinary(removedVariant.video);
    }

    // Remover de la lista
    userSkill.variants.splice(variantIndex, 1);

    await userSkill.save();

    res.json({
      success: true,
      message: "Variante eliminada correctamente",
      userSkill,
    });

  } catch (err) {
    console.error("deleteSkillVariant:", err);
    res.status(500).json({
      success: false,
      message: "Error del servidor",
    });
  }
};


// -------------------- Obtener Skills del Usuario --------------------
export const getUserSkills = async (req, res) => {
  try {
    const userId = req.userId;
    const userSkills = await UserSkill.find({ user: userId }).populate("skill");
    res.json({ success: true, userSkills });
  } catch (err) {
    console.error("getUserSkills:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

export const toggleFavoriteSkill = async (req, res) => {
  try {
    const userId = req.userId;
    const { userSkillId, variantKey } = req.params;

    // 1. Buscar la skill aprendida del user
    const userSkill = await UserSkill.findOne({
      _id: userSkillId,
      user: userId,
    });

    if (!userSkill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada en tu perfil"
      });
    }

    // 2. Verificar que la variante exista dentro de esa UserSkill
    const variant = userSkill.variants.find(v => v.variantKey === variantKey);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada dentro de tu skill"
      });
    }

    const user = await User.findById(userId);

    // 3. Verificar si YA es favorita
    const isFavorite = user.favoriteSkills.some(
      fav =>
        fav.userSkill.toString() === userSkillId.toString() &&
        fav.variantKey === variantKey
    );

    // --- Quitar favorito ---
    if (isFavorite) {
      user.favoriteSkills = user.favoriteSkills.filter(
        fav =>
          !(
            fav.userSkill.toString() === userSkillId.toString() &&
            fav.variantKey === variantKey
          )
      );

      await user.save();

      return res.json({
        success: true,
        message: "Variante removida de favoritas",
        favoriteSkills: user.favoriteSkills,
      });
    }

    // --- Verificar máximo 3 ---
    if (user.favoriteSkills.length >= 3) {
      return res.status(400).json({
        success: false,
        message: "Máximo 3 variantes favoritas",
      });
    }

    // --- Agregar favorito ---
    user.favoriteSkills.push({
      userSkill: userSkillId,
      variantKey,
    });

    await user.save();

    res.json({
      success: true,
      message: "Variante agregada a favoritas",
      favoriteSkills: user.favoriteSkills,
    });

  } catch (err) {
    console.error("toggleFavoriteSkill:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

export const getFavoriteSkills = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).lean();

    const favorites = [];

    for (const fav of user.favoriteSkills) {
      const userSkill = await UserSkill.findById(fav.userSkill).lean();
      if (!userSkill) continue;

      // Buscar la Skill por ID, que es lo correcto
      const skill = await Skill.findById(userSkill.skill).lean();
      if (!skill) continue;

      // Buscar variante en UserSkill
      const variant = userSkill.variants.find(
        (v) => v.variantKey === fav.variantKey
      );
      if (!variant) continue;

      favorites.push({
        skillId: skill._id,
        skillName: skill.name,
        skillKey: skill.skillKey,
        skillDifficulty: skill.difficulty,

        userSkillId: userSkill._id,
        variantKey: variant.variantKey,
        fingers: variant.fingers,
        video: variant.video,
      });
    }

    return res.json({
      success: true,
      favorites,
    });
  } catch (err) {
    console.error("getFavoriteSkills ERROR:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};