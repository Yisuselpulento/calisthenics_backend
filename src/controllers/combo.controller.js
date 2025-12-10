import Combo from "../models/combo.model.js";
import User from "../models/user.model.js";
import UserSkill from "../models/userSkill.model.js";
import Skill from "../models/skill.model.js"; // para conocer las variantes y stats
import { calculateEnergyCost } from "../utils/calculateEnergyCost.js";
import FeedEvent from "../models/feedEvent.model.js";
import { UpdateFullUser } from "../utils/updateFullUser.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";
import mongoose from "mongoose";


/* ---------------------------- CREATE ---------------------------- */

export const createCombo = async (req, res) => {
  let uploadResult = null;

  try {
    const userId = req.userId;
    const { name, type, elements } = req.body;

    // Validaciones básicas
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Debes subir un video para tu combo." });
    }

    if (!["static", "dynamic"].includes(type)) {
      return res.status(400).json({ success: false, message: "Tipo de combo inválido." });
    }

    const parsedElements = JSON.parse(elements);

    if (parsedElements.length < 3 || parsedElements.length > 10) {
      return res.status(400).json({ success: false, message: "Un combo debe tener entre 3 y 10 variantes." });
    }

    // Traer usuario con skills
    const user = await User.findById(userId)
      .populate({
        path: "skills",
        populate: { path: "skill", model: "Skill" }
      });

    if (!user) throw new Error("Usuario no encontrado");

    let totalEnergyCost = 0;

    // Validar cada variante usando userSkillVariantId
    const comboElements = parsedElements.map(el => {
      const userSkillVariantId = el.userSkillVariantId;

      let foundVariant = null;
      let foundUserSkill = null;

      for (const s of user.skills) {
        const uv = s.variants.find(v => String(v._id) === String(userSkillVariantId));
        if (uv) {
          foundVariant = uv;
          foundUserSkill = s;
          break;
        }
      }

      if (!foundVariant || !foundUserSkill) throw new Error("Variante no encontrada");

      // Buscar stats de la variante en la skill base
      const skillVariant = foundUserSkill.skill.variants.find(v => v.variantKey === foundVariant.variantKey);
      if (!skillVariant) throw new Error("Stats de la variante no encontradas");

      // Validar tipo de variante según tipo de combo
      if (type === "static" && !["static", "basic"].includes(skillVariant.type)) {
        throw new Error(`No puedes usar variantes dinámicas en un combo estático.`);
      }
      if (type === "dynamic" && !["dynamic", "basic"].includes(skillVariant.type)) {
        throw new Error(`No puedes usar variantes estáticas en un combo dinámico.`);
      }

      // Validar hold/reps
      const usesHold = skillVariant.stats.energyPerSecond > 0;
      const hold = el.hold ?? 0;
      const reps = el.reps ?? 0;

      if (usesHold && hold < 1) throw new Error(`Variante ${skillVariant.name} requiere hold en segundos.`);
      if (!usesHold && reps < 1) throw new Error(`Variante ${skillVariant.name} requiere reps.`);

      // Calcular energía
      const energyUsed = usesHold ? hold * skillVariant.stats.energyPerSecond : reps * skillVariant.stats.energyPerRep;
      totalEnergyCost += energyUsed;

      return {
        userSkill: foundUserSkill._id,
        skill: foundUserSkill.skill._id,
        userSkillVariantId: foundVariant._id,
        variantKey: foundVariant.variantKey,
        variantData: skillVariant,
        hold: usesHold ? hold : 0,
        reps: usesHold ? 0 : reps
      };
    });

    // Validar energía total según tipo de combo
    const userEnergy = type === "static" ? user.stats.staticAura : user.stats.dynamicAura;
    if (totalEnergyCost > userEnergy) {
      return res.status(400).json({ success: false, message: "No tienes suficiente energía para crear este combo." });
    }

    // Subir video
    uploadResult = await uploadToCloudinary(req.file, "combo_videos");

    // Crear combo
    const combo = await Combo.create({
      user: userId,
      name,
      type,
      elements: comboElements,
      video: uploadResult.secure_url,
      totalEnergyCost
    });

    // Actualizar usedInCombos de cada userSkill
    for (const el of parsedElements) {
      const userSkill = user.skills.find(s => s.variants.some(v => String(v._id) === String(el.userSkillVariantId)));
      if (!userSkill) continue;

      const alreadyUsed = userSkill.usedInCombos.some(
        u => String(u.combo) === String(combo._id) && String(u.variantKey) === String(el.variantKey)
      );

      if (!alreadyUsed) {
        userSkill.usedInCombos.push({
          combo: combo._id,
          userSkillVariantId: el.userSkillVariantId
        });
        await userSkill.save();
      }
    }

    // Guardar combo en usuario
    user.combos.push(combo._id);
    await user.save();

    // Crear evento de feed
    await FeedEvent.create({
      user: userId,
      type: "NEW_COMBO",
      message: `creó un nuevo combo: ${name} (${type})`,
      metadata: { comboId: combo._id, type }
    });

    // Actualizar usuario completo para frontend
    const updatedUser = await UpdateFullUser(userId);

    return res.status(201).json({
      success: true,
      message: "Combo creado correctamente",
      combo,
      user: updatedUser
    });

  } catch (err) {
    if (uploadResult?.secure_url) await deleteFromCloudinary(uploadResult.secure_url);
    return res.status(500).json({ success: false, message: err.message || "Error del servidor" });
  }
};

/* ---------------------------- DELETE ---------------------------- */

export const deleteCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    const userId = req.userId;

    if (!comboId) {
      return res.status(400).json({ success: false, message: "El ID del combo es requerido" });
    }

    const combo = await Combo.findById(comboId);
    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo no encontrado" });
    }

    if (String(combo.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "No tienes permiso para eliminar este combo" });
    }

    if (combo.video) {
  await deleteFromCloudinary(combo.video);

      await UserSkill.updateMany(
          { "usedInCombos.combo": comboId },
          { $pull: { usedInCombos: { combo: comboId } } }
        );
    }

    // 4️⃣ Eliminar el Combo
    await Combo.findByIdAndDelete(comboId);

    // 5️⃣ Actualizar referencias del usuario
    await User.findByIdAndUpdate(userId, {
      $pull: { combos: comboId },
      ...(combo.type === "static" && {
        $unset: { "favoriteCombos.static": "" }
      }),
      ...(combo.type === "dynamic" && {
        $unset: { "favoriteCombos.dynamic": "" }
      })
    });

    // 6️⃣ Eliminar eventos del feed
    await FeedEvent.deleteMany({
      "metadata.comboId": comboId
    });

    // 7️⃣ Retornar usuario actualizado Full
    const updatedUser = await UpdateFullUser(userId);

    return res.status(200).json({
      success: true,
      message: "Combo eliminado correctamente",
      user: updatedUser
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error eliminando combo", error: error.message });
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
      message: "Error obteniendo combos",
      error: error.message
    });
  }
};


/* ---------------------------- GET ONE ---------------------------- */

export const getComboById = async (req, res) => {
  try {
    const { comboId } = req.params;
    const userId = req.userId;

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

    if (String(combo.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para ver este combo"
      });
    }

    // ------------------- Traer todas las UserSkills del combo en un solo query -------------------
    const userSkillIds = combo.elements.map(el => el.userSkill);
    const userSkills = await UserSkill.find({ _id: { $in: userSkillIds } })
      .populate("skill"); // skill -> para variantes base

    // Crear un diccionario para acceso rápido por _id
    const userSkillMap = new Map();
    userSkills.forEach(us => userSkillMap.set(String(us._id), us));

    // ------------------- Construir elementos detallados -------------------
    const detailedElements = combo.elements.map(el => {
      const userSkill = userSkillMap.get(String(el.userSkill));
      if (!userSkill || !userSkill.skill) return null;

      const baseVariant = userSkill.skill.variants.find(v => v.variantKey === el.variantKey);
      const userVariant = userSkill.variants.find(v => v.variantKey === el.variantKey);

      if (!baseVariant) return null;

      return {
        userSkill: el.userSkill,
        variantKey: el.variantKey,
        hold: el.hold,
        video: userVariant?.video || null,
        fingers: userVariant?.fingers || null,
        pointsPerSecond: baseVariant.stats.pointsPerSecond,
        pointsPerRep: baseVariant.stats.pointsPerRep,
        staticAu: baseVariant.staticAu,
        dynamicAu: baseVariant.dynamicAu,
      };
    }).filter(Boolean); // eliminar elementos nulos

    // ------------------- Respuesta final -------------------
    return res.status(200).json({
      success: true,
      combo: {
        _id: combo._id,
        name: combo.name,
        type: combo.type,
        totalEnergyCost: combo.totalEnergyCost,
        totalPoints: combo.totalPoints,
        createdAt: combo.createdAt,
        updatedAt: combo.updatedAt,
        elements: detailedElements
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo combo",
      error: error.message
    });
  }
};


/* ---------------------------- UPDATE ---------------------------- */


export const updateCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    const userId = req.userId;
    const { name, elements } = req.body;

    if (!comboId) return res.status(400).json({ success: false, message: "El ID del combo es requerido" });

    const combo = await Combo.findById(comboId);
    if (!combo) return res.status(404).json({ success: false, message: "Combo no encontrado" });

    if (String(combo.user) !== String(userId))
      return res.status(403).json({ success: false, message: "No tienes permiso para actualizar este combo" });

    // Si el usuario envía elementos para actualizar
    let updatedElements = combo.elements;
    if (elements) {
      const user = await User.findById(userId).populate({ path: "skills", populate: { path: "skill", model: "Skill" } });
      if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

      updatedElements = [];

      for (const el of elements) {
        const userSkill = user.skills.find(s => String(s._id) === String(el.userSkill));
        if (!userSkill) return res.status(403).json({ success: false, message: `Intentas usar una UserSkill que no te pertenece: ${el.userSkill}` });

        const skill = userSkill.skill;
        if (!skill) return res.status(400).json({ success: false, message: "Skill no encontrada en UserSkill" });

        const variant = skill.variants.find(v => v.variantKey === el.variantKey);
        if (!variant) return res.status(400).json({ success: false, message: `Variante '${el.variantKey}' no encontrada en la skill base` });

        // Validación tipo de variante vs tipo de combo
        if (!validateComboType(combo.type, variant.type))
          return res.status(400).json({ success: false, message: `Combo ${combo.type} solo puede usar variantes ${combo.type}` });

        updatedElements.push({
          userSkill: el.userSkill,
          skill: skill._id,
          variantKey: el.variantKey,
          variantData: variant,
          hold: el.hold
        });
      }

      // Validar que la energía total no exceda la del usuario
      const totalEnergy = await calculateEnergyCost(updatedElements);
      if (totalEnergy > user.stats.energy)
        return res.status(400).json({ success: false, message: "No tienes suficiente energía para este combo" });

      combo.elements = updatedElements;
      combo.totalEnergyCost = totalEnergy;
    }

    // Actualizar nombre si viene
    if (name) combo.name = name;

    await combo.save();

    const updatedUser = await UpdateFullUser(userId);

        return res.status(200).json({
          success: true,
          message: "Combo actualizado correctamente",
          combo,
          user: updatedUser
        });

  } catch (err) {
    console.error("Error en updateCombo:", err);
    return res.status(500).json({ success: false, message: "Error actualizando combo", error: err.message });
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
    return res.status(500).json({ success: false, message: "Error actualizando combo favorito", error: error.message });
  }
};