import UserSkill from "../models/userSkill.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";
import User from "../models/user.model.js";
import Skill from "../models/skill.model.js";
import FeedEvent from "../models/feedEvent.model.js";
import { UpdateFullUser } from "../utils/updateFullUser.js";
import Combo from "../models/combo.model.js";
import { validateVariantProgression } from "../utils/variantValidation.js";
import { getUserStats } from "../utils/getUserStats.js";
import { createFeedEvent } from "../utils/createFeedEvent.js";

// -------------------- Agregar Variante --------------------
export const addSkillVariant = async (req, res) => {
  try {
    const userId = req.userId;
    const { skillId, variantKey, fingers = 5 } = req.body;

    if (!skillId || !variantKey || ![1, 2, 5].includes(Number(fingers))) {
      return res.status(400).json({ success: false, message: "Faltan datos o fingers inválido" });
    }

    const skill = await Skill.findById(skillId);
    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill base no encontrada" });
    }

    let userSkill = await UserSkill.findOne({ user: userId, skill: skillId });
    if (!userSkill) {
      userSkill = new UserSkill({ user: userId, skill: skillId, variants: [] });
    }

    const exists = userSkill.variants.some(v =>
      v.variantKey === variantKey && v.fingers === Number(fingers)
    );
    if (exists) {
      return res.status(400).json({ success: false, message: "Ya tienes esa variante con esos dedos" });
    }

    const validation = validateVariantProgression(skill, userSkill, variantKey);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "El video es obligatorio" });
    }

    let result;
      try {
        result = await uploadToCloudinary(req.file, "user_skill_videos", "video");

        userSkill.variants.push({
          variantKey,
          fingers: Number(fingers),
          video: result.secure_url,
          lastUpdated: new Date()
        });

        await userSkill.save(); 
      } catch (err) {
        if (result?.secure_url) {
          await deleteFromCloudinary(result.secure_url);
        }
        throw err; 
      }

    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { skills: userSkill._id } }
    );

    const newVariant = userSkill.variants[userSkill.variants.length - 1];

    await createFeedEvent({
  userId,
  type: "NEW_SKILL",
  message: `agregó una nueva variante a su skill: ${variantKey} (${fingers} dedos)`,
  metadata: {
    userSkillVariantId: newVariant._id,
    variantKey,
    fingers: Number(fingers),
    videoUrl: result.secure_url,
  }
});

    await getUserStats(userId);

    const fullUser = await UpdateFullUser(userId);

    return res.json({
      success: true,
      message: "Variante agregada correctamente",
      user: fullUser
    });

  } catch (err) {
    console.error("addSkillVariant:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

// -------------------- Editar Variante --------------------
export const editSkillVariant = async (req, res) => {
  try {
    const userId = req.userId;
    const { userSkillVariantId } = req.params;
    const { newFingers } = req.body;

    if (!userSkillVariantId) {
      return res.status(400).json({ success: false, message: "Debe proporcionar userSkillVariantId" });
    }

    // 🔹 Buscar UserSkill que tenga esta variante
    const userSkill = await UserSkill.findOne({ "variants._id": userSkillVariantId, user: userId });
    if (!userSkill) {
      return res.status(404).json({ success: false, message: "Variante no encontrada" });
    }

    // 🔹 Obtener la variante
    const variantIndex = userSkill.variants.findIndex(v => v._id.toString() === userSkillVariantId);
    const variant = userSkill.variants[variantIndex];

    const skill = await Skill.findById(userSkill.skill);
    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill base no encontrada" });
    }

    // ----------------- Actualizar fingers -----------------
    if (newFingers !== undefined) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Al cambiar los fingers, debes subir un nuevo video",
        });
      }

      const nf = Number(newFingers);
      if (![1, 2, 5].includes(nf)) {
        return res.status(400).json({ success: false, message: "Los fingers deben ser 1, 2 o 5" });
      }

      // Verificar duplicados
      const exists = userSkill.variants.some(
        (v, i) => i !== variantIndex && v.variantKey === variant.variantKey && v.fingers === nf
      );
      if (exists) {
        return res.status(400).json({ success: false, message: "Ya tienes esa variante con esos dedos" });
      }

      variant.fingers = nf;
    }

    // ----------------- Reemplazar video -----------------
    if (req.file) {
      let result;
      try {
        if (variant.video) await deleteFromCloudinary(variant.video);
        result = await uploadToCloudinary(req.file, "user_skill_videos", "video");
        variant.video = result.secure_url;
      } catch (err) {
        if (result?.secure_url) await deleteFromCloudinary(result.secure_url);
        throw err;
      }
    }

    // ----------------- Guardar cambios -----------------
    await userSkill.save();

    const fullUser = await UpdateFullUser(userId);
    return res.json({
      success: true,
      message: "Variante actualizada correctamente",
      user: fullUser,
    });

  } catch (err) {
    console.error("editSkillVariant:", err);
    return res.status(500).json({ success: false, message: "Error del servidor" });
  }
};


// -------------------- Eliminar Variante --------------------
export const deleteSkillVariant = async (req, res) => {
  try {
    const { userSkillVariantId } = req.params;
    const userId = req.userId;

    if (!userSkillVariantId) {
      return res.status(400).json({ success: false, message: "Debe proporcionar userSkillVariantId" });
    }

    // 🔹 Buscar UserSkill que tenga esta variante
    const userSkill = await UserSkill.findOne({ "variants._id": userSkillVariantId, user: userId });
    if (!userSkill) {
      return res.status(404).json({ success: false, message: "Variante no encontrada" });
    }

    // 🔹 Buscar la variante
    const variantIndex = userSkill.variants.findIndex(v => v._id.toString() === userSkillVariantId);
    const removedVariant = userSkill.variants[variantIndex];

    // 🔹 Verificar si se usa en algún combo
      const variantUsed = await Combo.findOne({
      user: userId,
      elements: {
        $elemMatch: {
          userSkill: userSkill._id,
          userSkillVariantId: userSkillVariantId
        }
      }
    });

    if (variantUsed) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar esta variante porque está siendo utilizada en un combo. Elimínala primero del combo."
      });
    }

    // 🔹 Eliminar video si existe
    if (removedVariant.video) {
      await deleteFromCloudinary(removedVariant.video);
    }

    // 🔹 Eliminar la variante
    userSkill.variants.splice(variantIndex, 1);

    // ⚠️ Si ya no quedan variantes, borrar todo el UserSkill
    if (userSkill.variants.length === 0) {
      await UserSkill.deleteOne({ _id: userSkill._id });

      await User.findByIdAndUpdate(userId, {
        $pull: { skills: userSkill._id, favoriteSkills: { userSkill: userSkill._id } }
      });

      await FeedEvent.deleteMany({
        user: userId,
        "metadata.skillId": userSkill.skill.toString()
      });

      await getUserStats(userId);
      const fullUser = await UpdateFullUser(userId);

      return res.json({
        success: true,
        message: "Skill eliminada por completo",
        user: fullUser,
      });
    }

    // 🔹 Si quedan variantes: guardar y actualizar stats
    await userSkill.save();
    await getUserStats(userId);

    await FeedEvent.deleteMany({
      user: userId,
      "metadata.skillId": userSkill.skill.toString(),
      "metadata.userSkillVariantId": userSkillVariantId
    });

    await Combo.updateMany(
      { user: userId },
      { $pull: { elements: { userSkill: userSkill._id, userSkillVariantId } } }
    );

    const fullUser = await UpdateFullUser(userId);

    return res.json({
      success: true,
      message: "Variante eliminada correctamente",
      user: fullUser,
    });

  } catch (err) {
    console.error("deleteSkillVariant:", err);
    return res.status(500).json({
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
    const { userSkillVariantId } = req.params;

    if (!userSkillVariantId) {
      return res.status(400).json({ success: false, message: "Debe proporcionar userSkillVariantId" });
    }

    // 1. Buscar la UserSkill que tenga esta variante
    const userSkill = await UserSkill.findOne({
      "variants._id": userSkillVariantId,
      user: userId,
    });

    if (!userSkill) {
      return res.status(404).json({ success: false, message: "Variante no encontrada en tu perfil" });
    }

    // 2. Obtener la variante
    const variant = userSkill.variants.find(v => v._id.toString() === userSkillVariantId);

    if (!variant) {
      return res.status(404).json({ success: false, message: "Variante no encontrada dentro de tu skill" });
    }

    const user = await User.findById(userId);

    // 3. Verificar si ya es favorita
    const isFavorite = user.favoriteSkills.some(
      fav => fav.userSkillVariantId.toString() === userSkillVariantId
    );

    // --- Quitar favorito ---
    if (isFavorite) {
      user.favoriteSkills = user.favoriteSkills.filter(
        fav => fav.userSkillVariantId.toString() !== userSkillVariantId
      );

      await user.save();
      const fullUser = await UpdateFullUser(userId);
      return res.json({
        success: true,
        message: "Variante removida de favoritas",
        user: fullUser,
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
      userSkill: userSkill._id,
      userSkillVariantId,
      fingers: variant.fingers, // opcional, para referencia rápida
    });

    await user.save();
    const fullUser = await UpdateFullUser(userId);

    return res.json({
      success: true,
      message: "Variante agregada a favoritas",
      user: fullUser,
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

// -------------------- Obtener skill específica del usuario --------------------
export const getUserSkillVariantById = async (req, res) => {
  try {
    const { userSkillVariantId } = req.params;

    if (!userSkillVariantId) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar userSkillVariantId",
      });
    }

    // Buscar la UserSkill que tenga esta variante
    const userSkill = await UserSkill.findOne({ "variants._id": userSkillVariantId })
      .populate("skill")
      .lean();

    if (!userSkill) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    // Extraer la variante
    const userVariant = userSkill.variants.find(
      (v) => v._id.toString() === userSkillVariantId
    );

    // Extraer info de la Skill si existe la variante correspondiente
    const skillVariant = userSkill.skill.variants.find(
      (v) => v.variantKey === userVariant.variantKey
    );

     let usedInCombosDetailed = [];

     if (Array.isArray(userVariant.usedInCombos) && userVariant.usedInCombos.length > 0) {
      const comboIds = userVariant.usedInCombos.map((c) => c.combo);

      const combos = await Combo.find(
        { _id: { $in: comboIds } },
        { name: 1 }
      ).lean();

      usedInCombosDetailed = combos.map((c) => ({
        comboId: c._id,
        name: c.name,
      }));
    }

    const variantData = {
      userSkillVariantId: userVariant._id,
      userSkillId: userSkill._id,
      skillId: userSkill.skill._id,
      skillName: userSkill.skill.name,
      skillKey: userSkill.skill.skillKey,
      fingers: userVariant.fingers,
      skillDifficulty: userSkill.skill.difficulty,
      variantKey: userVariant.variantKey,
      name: skillVariant?.name || userVariant.variantKey,
      type: skillVariant?.type || "static",
      staticAU: skillVariant?.staticAu || 0,
      dynamicAU: skillVariant?.dynamicAu || 0,
      stats: skillVariant?.stats || {},
      video: userVariant.video || null,
      usedInCombos: usedInCombosDetailed,
    };

    return res.json({ success: true, variant: variantData });
  } catch (err) {
    console.error("getUserSkillVariantById:", err);
    return res.status(500).json({
      success: false,
      message: "Error del servidor",
    });
  }
};


