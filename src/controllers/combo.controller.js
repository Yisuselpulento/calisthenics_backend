import Combo from "../models/combo.model.js";
import User from "../models/user.model.js";
import UserSkill from "../models/userSkill.model.js";
import Skill from "../models/skill.model.js"; // para conocer las variantes y stats
import { calculateEnergyCost } from "../utils/calculateEnergyCost.js";
import FeedEvent from "../models/feedEvent.model.js";
import { UpdateFullUser } from "../utils/updateFullUser.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";
import mongoose from "mongoose";
import { createFeedEvent } from "../utils/createFeedEvent.js";
import { cloudinaryFolder } from "../utils/cloudinaryFolder.js";


/* ---------------------------- CREATE ---------------------------- */

export const createCombo = async (req, res) => {
  let uploadResult = null;

  try {
    const userId = req.userId;
    const { name, type, elements } = req.body;

    /* ------------------ Auth ------------------ */
    if (!req.user?.username) {
      return res.status(400).json({
        success: false,
        message: "No se pudo identificar el usuario",
      });
    }

    /* ------------------ Validaciones básicas ------------------ */
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Debes subir un video para tu combo",
      });
    }

    if (!["static", "dynamic"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de combo inválido",
      });
    }

    const parsedElements = JSON.parse(elements);

    if (parsedElements.length < 3 || parsedElements.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Un combo debe tener entre 3 y 10 variantes",
      });
    }

    /* ------------------ Usuario ------------------ */
    const user = await User.findById(userId).populate({
      path: "skills",
      populate: { path: "skill", model: "Skill" },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    /* ------------------ Validar y construir elementos ------------------ */
    let totalEnergyCost = 0;
    const seenVariants = new Set();
    const comboElements = [];

    for (const el of parsedElements) {
      const { userSkillVariantId } = el;

      if (seenVariants.has(userSkillVariantId)) {
        return res.status(400).json({
          success: false,
          message: "No puedes repetir una variante en el mismo combo",
        });
      }
      seenVariants.add(userSkillVariantId);

      let foundUserSkill = null;
      let foundVariant = null;

      for (const s of user.skills) {
        const uv = s.variants.find(
          v => String(v._id) === String(userSkillVariantId)
        );
        if (uv) {
          foundUserSkill = s;
          foundVariant = uv;
          break;
        }
      }

      if (!foundUserSkill || !foundVariant) {
        return res.status(400).json({
          success: false,
          message: "Variante no encontrada",
        });
      }

      const skillVariant = foundUserSkill.skill.variants.find(
        v => v.variantKey === foundVariant.variantKey
      );

      if (!skillVariant) {
        return res.status(400).json({
          success: false,
          message: "Stats de la variante no encontradas",
        });
      }

      /* -------- Tipo combo -------- */
      if (
        type === "static" &&
        !["static", "basic"].includes(skillVariant.type)
      ) {
        return res.status(400).json({
          success: false,
          message: "No puedes usar variantes dinámicas en un combo estático",
        });
      }

      if (
        type === "dynamic" &&
        !["dynamic", "basic"].includes(skillVariant.type)
      ) {
        return res.status(400).json({
          success: false,
          message: "No puedes usar variantes estáticas en un combo dinámico",
        });
      }

      /* -------- Hold / Reps -------- */
      const usesHold = skillVariant.stats.energyPerSecond > 0;
      const hold = el.hold ?? 0;
      const reps = el.reps ?? 0;

      if (usesHold && hold < 1) {
        return res.status(400).json({
          success: false,
          message: `La variante ${skillVariant.name} requiere hold`,
        });
      }

      if (!usesHold && reps < 1) {
        return res.status(400).json({
          success: false,
          message: `La variante ${skillVariant.name} requiere reps`,
        });
      }

      const energyUsed = usesHold
        ? hold * skillVariant.stats.energyPerSecond
        : reps * skillVariant.stats.energyPerRep;

      totalEnergyCost += energyUsed;

      comboElements.push({
        userSkill: foundUserSkill._id,
        skill: foundUserSkill.skill._id,
        userSkillVariantId: foundVariant._id,
        variantKey: foundVariant.variantKey,
        variantData: skillVariant,
        hold: usesHold ? hold : 0,
        reps: usesHold ? 0 : reps,
      });
    }

    /* ------------------ Energía ------------------ */
    const userEnergy =
      type === "static" ? user.stats.staticAura : user.stats.dynamicAura;

    if (totalEnergyCost > userEnergy) {
      return res.status(400).json({
        success: false,
        message: "No tienes suficiente energía para crear este combo",
      });
    }

    /* ------------------ Subir video ------------------ */
    uploadResult = await uploadToCloudinary(
      req.file,
      cloudinaryFolder({
        username: req.user.username,
        type: "user_combos",
      })
    );

    /* ------------------ Crear combo ------------------ */
    const combo = await Combo.create({
      user: userId,
      name,
      type,
      elements: comboElements,
      video: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      },
      totalEnergyCost,
    });

    /* ------------------ usedInCombos ------------------ */
    for (const el of comboElements) {
      const userSkill = await UserSkill.findById(el.userSkill);
      if (!userSkill) continue;

      const variant = userSkill.variants.id(el.userSkillVariantId);
      if (!variant) continue;

      if (
        !variant.usedInCombos.some(
          u => String(u.combo) === String(combo._id)
        )
      ) {
        variant.usedInCombos.push({ combo: combo._id });
        await userSkill.save();
      }
    }

    user.combos.push(combo._id);
    await user.save();

    await createFeedEvent({
      userId,
      type: "NEW_COMBO",
      message: `creó un nuevo combo: ${name} (${type})`,
      metadata: {
        comboId: combo._id,
        type,
        videoUrl: uploadResult.url,
      },
    });

    const updatedUser = await UpdateFullUser(userId);

    return res.status(201).json({
      success: true,
      message: "Combo creado correctamente",
      combo,
      user: updatedUser,
    });
  } catch (error) {
    if (uploadResult?.publicId) {
      await deleteFromCloudinary(uploadResult.publicId, "video");
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};


/* ---------------------------- DELETE ---------------------------- */

export const deleteCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    const userId = req.userId;

    if (!comboId) {
      return res.status(400).json({
        success: false,
        message: "El ID del combo es requerido"
      });
    }

    const combo = await Combo.findById(comboId);
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: "Combo no encontrado"
      });
    }

    if (String(combo.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para eliminar este combo"
      });
    }

    /* ------------------ Borrar video de Cloudinary ------------------ */
    if (combo.video?.publicId) {
      await deleteFromCloudinary(combo.video.publicId, "video");
    }

    /* ------------------ Limpiar usedInCombos ------------------ */
    const userSkills = await UserSkill.find({
      "variants.usedInCombos.combo": comboId
    });

    for (const userSkill of userSkills) {
      let modified = false;

      userSkill.variants.forEach(variant => {
        const originalLength = variant.usedInCombos.length;
        variant.usedInCombos = variant.usedInCombos.filter(
          u => String(u.combo) !== String(comboId)
        );
        if (variant.usedInCombos.length !== originalLength) {
          modified = true;
        }
      });

      if (modified) await userSkill.save();
    }

    /* ------------------ Eliminar combo ------------------ */
    await Combo.findByIdAndDelete(comboId);

    /* ------------------ Actualizar usuario ------------------ */
    await User.findByIdAndUpdate(userId, {
      $pull: { combos: comboId },
      ...(combo.type === "static" && {
        $unset: { "favoriteCombos.static": "" }
      }),
      ...(combo.type === "dynamic" && {
        $unset: { "favoriteCombos.dynamic": "" }
      })
    });

    /* ------------------ Eliminar eventos del feed ------------------ */
    await FeedEvent.deleteMany({
      user: userId,
      "metadata.comboId": new mongoose.Types.ObjectId(comboId)
    });

    /* ------------------ Retornar usuario actualizado ------------------ */
    const updatedUser = await UpdateFullUser(userId);

    return res.status(200).json({
      success: true,
      message: "Combo eliminado correctamente",
      user: updatedUser
    });

  } catch (error) {
    console.error("deleteCombo error:", error);
     return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};


/* ---------------------------- GET ALL ---------------------------- */

export const getUserCombos = async (req, res) => {
  try {
    const userId = req.userId; // viene del token

    // 1. Validar que venga userId desde el token
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "No autorizado. Usuario no autenticado."
      });
    }


    // 3. Validar que el usuario exista
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // 4. Obtener los combos del usuario autenticado
    const combos = await Combo.find({ user: userId })
      .select("name type totalEnergyCost totalPoints createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: combos.length,
      combos
    });

  } catch (error) {
    console.error("Error en getUserCombos:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};


/* ---------------------------- GET ONE ---------------------------- */

export const getComboById = async (req, res) => {
  try {
    const { comboId } = req.params;

    if (!comboId) {
      return res.status(400).json({
        success: false,
        message: "El ID del combo es requerido"
      });
    }

    // ------------------- Buscar combo -------------------
    const combo = await Combo.findById(comboId);
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: "Combo no encontrado"
      });
    }

    // ------------------- Buscar UserSkills usados -------------------
    const userSkillIds = combo.elements.map(el => el.userSkill);

    const userSkills = await UserSkill.find({
      _id: { $in: userSkillIds }
    }).populate("skill"); // skill original

    const userSkillMap = new Map();
    userSkills.forEach(us => userSkillMap.set(String(us._id), us));

    // ------------------- Construir elementos con la variante usando userSkillVariantId -------------------
    const detailedElements = combo.elements.map(el => {
      const userSkill = userSkillMap.get(String(el.userSkill));
      if (!userSkill) return null;

      // Buscar la variante EXACTA por su ID
      const userVariant = userSkill.variants.find(v => String(v._id) === String(el.userSkillVariantId));
      if (!userVariant) return null;

      // Buscar variante base (misma variantKey)
      const baseVariant = userSkill.skill.variants.find(v => v.variantKey === userVariant.variantKey);
      if (!baseVariant) return null;

      return {
        userSkill: el.userSkill,
        userSkillVariantId: el.userSkillVariantId,
        // skill original
        skillName: userSkill.skill.name,

        // info variante
        variantKey: userVariant.variantKey,
        variantName: baseVariant.name,

        // datos del combo
        hold: el.hold,
        reps: el.reps,

        // datos usuario
        video: userVariant.video || null,
        fingers: userVariant.fingers || null,

        // stats base
        pointsPerSecond: baseVariant.stats?.pointsPerSecond || 0,
        pointsPerRep: baseVariant.stats?.pointsPerRep || 0,
        energyPerRep: baseVariant.stats?.energyPerRep || 0,
        energyPerSecond: baseVariant.stats?.energyPerSecond || 0,
        staticAu: baseVariant.staticAu || 0,
        dynamicAu: baseVariant.dynamicAu || 0,
      };
    }).filter(Boolean);

    // ------------------- Respuesta -------------------
    return res.status(200).json({
      success: true,
      combo: {
        _id: combo._id,
        name: combo.name,
        type: combo.type,
        video: combo.video,
        totalEnergyCost: combo.totalEnergyCost,
        totalPoints: combo.totalPoints,
        createdAt: combo.createdAt,
        updatedAt: combo.updatedAt,
        elements: detailedElements,
        owner: combo.user,
      }
    });

  } catch (error) {
    console.error("Error en updateCombo:", error);
     return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};


/* ---------------------------- UPDATE ---------------------------- */


export const updateCombo = async (req, res) => {
  let uploadResult = null;

  try {
    const { comboId } = req.params;
    const userId = req.userId;
    const { name } = req.body;

    const elements = req.body.elements
      ? JSON.parse(req.body.elements)
      : null;

    /* ------------------ Validaciones base ------------------ */
    if (!comboId) {
      return res.status(400).json({
        success: false,
        message: "El ID del combo es requerido",
      });
    }

    const combo = await Combo.findById(comboId);
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: "Combo no encontrado",
      });
    }

    if (String(combo.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para actualizar este combo",
      });
    }

    /* ------------------ Actualizar nombre ------------------ */
    if (typeof name === "string" && name.trim().length > 0) {
      combo.name = name.trim();
    }

    /* ------------------ Detectar cambios en elementos ------------------ */
    let elementsChanged = false;

    if (elements && Array.isArray(elements)) {
      const elementMap = new Map();
      combo.elements.forEach(el => {
        elementMap.set(String(el.userSkillVariantId), el);
      });

      for (const el of elements) {
        const comboElement = elementMap.get(String(el.userSkillVariantId));

        if (!comboElement) {
          return res.status(400).json({
            success: false,
            message: "No puedes modificar elementos que no pertenecen al combo",
          });
        }

        if (
          (el.hold !== undefined && el.hold !== comboElement.hold) ||
          (el.reps !== undefined && el.reps !== comboElement.reps)
        ) {
          elementsChanged = true;
          break;
        }
      }
    }

    /* ------------------ Validar video obligatorio ------------------ */
    if (elementsChanged && !req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Si modificas los segundos o repeticiones debes subir un nuevo video",
      });
    }

    /* ------------------ Subir nuevo video ------------------ */
    if (req.file) {
      uploadResult = await uploadToCloudinary(
        req.file,
        cloudinaryFolder({
          username: req.user.username,
          type: "user_combos",
        })
      );

      if (combo.video?.publicId) {
        await deleteFromCloudinary(combo.video.publicId, "video");
      }

      combo.video = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      };
    }

    /* ------------------ Actualizar elementos ------------------ */
    if (elements && Array.isArray(elements)) {
      const elementMap = new Map();
      combo.elements.forEach(el => {
        elementMap.set(String(el.userSkillVariantId), el);
      });

      for (const el of elements) {
        const comboElement = elementMap.get(String(el.userSkillVariantId));
        const stats = comboElement.variantData.stats;

        const usesHold = stats.energyPerSecond > 0;

        const hold = el.hold ?? comboElement.hold;
        const reps = el.reps ?? comboElement.reps;

        if (usesHold && hold < 1) {
          return res.status(400).json({
            success: false,
            message: `La variante ${comboElement.variantData.name} requiere hold`,
          });
        }

        if (!usesHold && reps < 1) {
          return res.status(400).json({
            success: false,
            message: `La variante ${comboElement.variantData.name} requiere reps`,
          });
        }

        comboElement.hold = usesHold ? hold : 0;
        comboElement.reps = usesHold ? 0 : reps;
      }

      /* ------------------ Recalcular energía ------------------ */
      combo.totalEnergyCost = combo.elements.reduce((total, el) => {
        const stats = el.variantData.stats;
        return total + (
          stats.energyPerSecond > 0
            ? el.hold * stats.energyPerSecond
            : el.reps * stats.energyPerRep
        );
      }, 0);

      /* ------------------ Recalcular puntos ------------------ */
      combo.totalPoints = combo.elements.reduce((total, el) => {
        const stats = el.variantData.stats;
        return total + (
          stats.pointsPerSecond > 0
            ? el.hold * stats.pointsPerSecond
            : el.reps * stats.pointsPerRep
        );
      }, 0);

      /* ------------------ Validar energía del usuario ------------------ */
      const user = await User.findById(userId);

      const userEnergy =
        combo.type === "static"
          ? user.stats.staticAura
          : user.stats.dynamicAura;

      if (combo.totalEnergyCost > userEnergy) {
        return res.status(400).json({
          success: false,
          message:
            "No tienes suficiente energía para este combo con los cambios realizados",
        });
      }
    }

    /* ------------------ Guardar ------------------ */
    await combo.save();

    const updatedUser = await UpdateFullUser(userId);

    return res.status(200).json({
      success: true,
      message: "Combo actualizado correctamente",
      combo,
      user: updatedUser,
    });

  } catch (error) {
    if (uploadResult?.publicId) {
      await deleteFromCloudinary(uploadResult.publicId, "video");
    }

    console.error("updateCombo error:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};


/* ---------------------------- FAVORITE ---------------------------- */

export const toggleFavoriteCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    const { type } = req.body; // debe ser "static" o "dynamic"
    const userId = req.userId;

    if (!comboId || !type || !["static", "dynamic"].includes(type)) {
      return res.status(400).json({ success: false, message: "ComboId y tipo válido son requeridos" });
    }

    const combo = await Combo.findById(comboId);
    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo no encontrado" });
    }

    if (String(combo.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "No puedes seleccionar un combo que no es tuyo" });
    }

    // Toggle: si ya está seleccionado, se quita; si no, se coloca
    const user = await User.findById(userId);
    const currentFavorite = user.favoriteCombos[type];

    if (String(currentFavorite) === comboId) {
      user.favoriteCombos[type] = null; // deselecciona
    } else {
      user.favoriteCombos[type] = comboId; // selecciona
    }

    await user.save();

    const updatedUser = await UpdateFullUser(userId);

        return res.status(200).json({
          success: true,
          message: `Combo favorito ${type} actualizado correctamente`,
          favoriteCombos: updatedUser.favoriteCombos,
          user: updatedUser
        });

  } catch (error) {
    console.error("Error en toggle favorite:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};