import Skill from "../models/skill.model.js";
import UserSkill from "../models/userSkill.model.js";
import { recalculateUserStats } from "../utils/statsService.js";

export const addVariant = async (req, res) => {
  try {
    const { skillKey } = req.params;
    const {
      name,
      variantKey,
      type,
      difficulty,
      stats = {},
      staticAu = 0,
      dynamicAu = 0,
      progressionLevel,
    } = req.body;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada",
      });
    }

    if (!name || !variantKey || !type || progressionLevel === undefined) {
      return res.status(400).json({
        success: false,
        message: "name, variantKey, type y progressionLevel son requeridos",
      });
    }

    const allowedTypes = ["static", "dynamic", "basic"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type inválido",
      });
    }

    const allowedDifficulties = [
      "basic",
      "intermediate",
      "advanced",
      "elite",
      "legendary",
    ];

    if (difficulty && !allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "difficulty inválido",
      });
    }

    if (progressionLevel < 1 || progressionLevel > 4) {
      return res.status(400).json({
        success: false,
        message: "progressionLevel debe estar entre 1 y 4",
      });
    }

    const exists = skill.variants.some(v => v.variantKey === variantKey);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "variantKey ya existe en esta skill",
      });
    }

    skill.variants.push({
      name,
      variantKey,
      type,
      difficulty,
      stats,
      staticAu,
      dynamicAu,
      progressionLevel,
    });

    await skill.save();

    return res.status(201).json({
      success: true,
      message: "Variante creada correctamente",
      data: skill.variants,
    });

  } catch (error) {
    console.error("addVariant:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};



export const updateVariant = async (req, res) => {
  try {
    const { skillKey, variantKey } = req.params;
    const {
      name,
      type,
      difficulty,
      stats,
      staticAu,
      dynamicAu,
      progressionLevel,
    } = req.body;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada",
      });
    }

    const variant = skill.variants.find(v => v.variantKey === variantKey);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    const allowedTypes = ["static", "dynamic", "basic"];
    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type inválido",
      });
    }

    const allowedDifficulties = [
      "basic",
      "intermediate",
      "advanced",
      "elite",
      "legendary",
    ];

    if (difficulty && !allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "difficulty inválido",
      });
    }

    if (progressionLevel !== undefined) {
      if (progressionLevel < 1 || progressionLevel > 4) {
        return res.status(400).json({
          success: false,
          message: "progressionLevel debe estar entre 1 y 4",
        });
      }
      variant.progressionLevel = progressionLevel;
    }

    if (stats) {
      const allowedStats = [
        "pointsPerSecond",
        "energyPerSecond",
        "pointsPerRep",
        "energyPerRep",
      ];

      for (const key of Object.keys(stats)) {
        if (!allowedStats.includes(key)) {
          return res.status(400).json({
            success: false,
            message: `Campo de stats no permitido: ${key}`,
          });
        }
      }

      Object.assign(variant.stats, stats);
    }

    if (name) variant.name = name;
    if (type) variant.type = type;
    if (difficulty) variant.difficulty = difficulty;
    if (staticAu !== undefined) variant.staticAu = staticAu;
    if (dynamicAu !== undefined) variant.dynamicAu = dynamicAu;

    variant.lastStatChange = new Date();

    await skill.save();

    return res.json({
      success: true,
      message: "Variante actualizada correctamente",
      data: skill.variants,
    });

  } catch (error) {
    console.error("updateVariant:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};


export const deleteVariant = async (req, res) => {
  try {
    const { skillKey, variantKey } = req.params;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada",
      });
    }

    const before = skill.variants.length;
    skill.variants = skill.variants.filter(v => v.variantKey !== variantKey);

    if (skill.variants.length === before) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    await skill.save();

    return res.json({
      success: true,
      message: "Variante eliminada correctamente",
      data: skill.variants,
    });

  } catch (error) {
    console.error("deleteVariant:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};


export const getAllVariants = async (req, res) => {
  try {
    const { skillKey } = req.params;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada",
      });
    }

    return res.json({
      success: true,
      data: skill.variants,
    });
  } catch (error) {
    console.error("getAllVariants:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};



export const getVariantByKey = async (req, res) => {
  try {
    const { skillKey, variantKey } = req.params;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada",
      });
    }

    const variant = skill.variants.find(v => v.variantKey === variantKey);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    return res.json({
      success: true,
      data: variant,
    });
  } catch (error) {
    console.error("getVariantByKey:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};
