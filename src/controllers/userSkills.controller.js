import UserSkill from "../models/userSkill.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";
import User from "../models/user.model.js";
import Skill from "../models/skill.model.js";
import FeedEvent from "../models/feedEvent.model.js";
import { UpdateFullUser } from "../utils/updateFullUser.js";
import Combo from "../models/combo.model.js";
import { validateVariantProgression } from "../utils/variantValidation.js";
import { getUserStats } from "../utils/getUserStats.js";

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

    const feedMessage = `agregó una nueva variante a su skill: ${variantKey} (${fingers} dedos)`;

    await FeedEvent.create({
      user: userId,
      type: "NEW_SKILL",
      message: feedMessage,
      metadata: {
        skillId,
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
    const { userSkillId, variantKey, fingers } = req.params;
    const { newFingers } = req.body;

    // Buscar la skill del usuario
    const userSkill = await UserSkill.findOne({ _id: userSkillId, user: userId });
    if (!userSkill)
      return res.status(404).json({ success: false, message: "Skill no encontrada" });

    const skill = await Skill.findById(userSkill.skill);
    if (!skill)
      return res.status(404).json({ success: false, message: "Skill base no encontrada" });

    // Buscar variante actual
    const variantIndex = userSkill.variants.findIndex(
      (v) => v.variantKey === variantKey && v.fingers === Number(fingers)
    );
    if (variantIndex === -1)
      return res.status(404).json({ success: false, message: "Variante no encontrada" });

    const variant = userSkill.variants[variantIndex];

    // ----------------- Actualizar fingers -----------------
    if (newFingers !== undefined) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Al cambiar los fingers, debes subir un nuevo video",
        });
      }

      const nf = Number(newFingers);
      if (![1, 2, 5].includes(nf))
        return res.status(400).json({ success: false, message: "Los fingers deben ser 1, 2 o 5" });

      // Verificar duplicados
      const exists = userSkill.variants.some(
        (v, i) => i !== variantIndex && v.variantKey === variant.variantKey && v.fingers === nf
      );
      if (exists)
        return res.status(400).json({ success: false, message: "Ya tienes esa variante con esos dedos" });

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
        // rollback en caso de fallo
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
    const { userSkillId, variantKey, fingers } = req.params;
    const userId = req.userId;

    const userSkill = await UserSkill.findOne({ _id: userSkillId, user: userId });
    if (!userSkill) {
      return res.status(404).json({ success: false, message: "Skill no encontrada" });
    }

    const variantIndex = userSkill.variants.findIndex(
      v => v.variantKey === variantKey && v.fingers === Number(fingers)
    );

    if (variantIndex === -1) {
      return res.status(404).json({ success: false, message: "Variante no encontrada" });
    }

    const variantUsed = await Combo.findOne({
      user: userId,
      "elements.userSkill": userSkillId,
      "elements.variantKey": variantKey
    });

    if (variantUsed) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar esta variante porque está siendo utilizada en un combo. Elimínala primero del combo."
      });
    }

    const removedVariant = userSkill.variants[variantIndex];

    if (removedVariant.video) {
      await deleteFromCloudinary(removedVariant.video);
    }

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

      // 🔥 Recalcular stats si se elimina la skill completa
      await getUserStats(userId);

      const fullUser = await UpdateFullUser(userId);

      return res.json({
        success: true,
        message: "Skill eliminada por completo",
        user: fullUser,
      });
    }

    // Si quedan variantes: guardar y actualizar stats
    await userSkill.save();
    await getUserStats(userId);

    await FeedEvent.deleteMany({
      user: userId,
      "metadata.skillId": userSkill.skill.toString(),
      "metadata.variantKey": variantKey,
      "metadata.fingers": Number(fingers),
    });

    await Combo.updateMany(
      { user: userId },
      { $pull: { elements: { userSkill: userSkill._id, variantKey, fingers: Number(fingers) } } }
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
    const { userSkillId, variantKey, fingers } = req.params; 

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

    // 2. Verificar que la variante exista dentro de esa UserSkill con los fingers correctos
    const variant = userSkill.variants.find(v => 
      v.variantKey === variantKey && v.fingers === Number(fingers)
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada dentro de tu skill con esos fingers"
      });
    }

    const user = await User.findById(userId);

    // 3. Verificar si YA es favorita
    const isFavorite = user.favoriteSkills.some(
      fav =>
        fav.userSkill.toString() === userSkillId.toString() &&
        fav.variantKey === variantKey &&
        fav.fingers === Number(fingers)
    );

    // --- Quitar favorito ---
    if (isFavorite) {
      user.favoriteSkills = user.favoriteSkills.filter(
        fav =>
          !(
            fav.userSkill.toString() === userSkillId.toString() &&
            fav.variantKey === variantKey &&
            fav.fingers === Number(fingers)
          )
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
      userSkill: userSkillId,
      variantKey,
      fingers: Number(fingers), // <-- guardar fingers
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
    const { userSkillId, variantKey, fingers } = req.params;

    if (!userSkillId || !variantKey || !fingers) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar userSkillId, variantKey y fingers",
      });
    }

    // 🔹 Buscar UserSkill con Skill poblado
    const userSkill = await UserSkill.findById(userSkillId)
      .populate("skill")
      .lean();

    if (!userSkill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada",
      });
    }

    // 🔹 Buscar la variante en UserSkill
    const userVariant = userSkill.variants.find(
      (v) => v.variantKey === variantKey && v.fingers === Number(fingers)
    );

    if (!userVariant) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    // 🔹 Buscar la variante en Skill para traer stats y demás info
    const skillVariant = userSkill.skill.variants.find(
      (v) => v.variantKey === variantKey
    );

    // 🔹 Preparar la info completa
    const variantData = {
      userSkillId: userSkill._id,
      skillId: userSkill.skill._id,
      skillName: userSkill.skill.name,
      skillKey: userSkill.skill.skillKey,
      skillDifficulty: userSkill.skill.difficulty,
      variantKey: userVariant.variantKey,
      fingers: userVariant.fingers,
      name: skillVariant?.name || userVariant.variantKey,
      type: skillVariant?.type || "static",
      staticAU: skillVariant?.staticAu || 0,
      dynamicAU: skillVariant?.dynamicAu || 0,
      stats: skillVariant?.stats || {},
      video: userVariant.video || null,
      usedInCombos: userSkill.usedInCombos || [],
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


