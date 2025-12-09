import Skill from "../models/skill.model.js";
import UserSkill from "../models/userSkill.model.js";
import { recalculateUserStats } from "../utils/statsService.js";

export const addVariant = async (req, res) => {
  try {
    const { skillKey } = req.params;
    const { name, variantKey, type, difficulty, stats, staticAu, dynamicAu, progressionLevel  } = req.body;

    const skill = await Skill.findOne({ skillKey });

    if (!skill) {
      return res.status(404).json({ message: "Skill no encontrada." });
    }

    // validaciones
    if (!name || !variantKey || !type || progressionLevel === undefined) {
      return res.status(400).json({ message: "name, variantKey, type y progressionLevel son requeridos." });
    }

    const allowedTypes = ["static", "dynamic", "basic"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "type inválido." });
    }

    const allowedVariantDifficulties = [
      "basic",
      "intermediate",
      "advanced",
      "elite",
      "legendary"
    ];

    if (difficulty && !allowedVariantDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: "difficulty de variante inválido." });
    }

    if (progressionLevel < 1 || progressionLevel > 4) {
      return res.status(400).json({ message: "progressionLevel debe estar entre 1 y 4." });
    }

    const exists = skill.variants.find(v => v.variantKey === variantKey);
    if (exists) {
      return res.status(400).json({ message: "variantKey ya existe en esta skill." });
    }

    skill.variants.push({
      name,
      variantKey,
      type,
      difficulty,
      staticAu: staticAu ?? 0,
      dynamicAu: dynamicAu ?? 0,
      stats: stats ?? {},
      progressionLevel
    });

    await skill.save();

    res.status(201).json(skill);
  } catch (error) {
     console.error("Error creando variante:", error); 
    res.status(500).json({ message: "Error creando variante." });
  }
};


export const updateVariant = async (req, res) => {
  try {
    const { skillKey, variantKey } = req.params;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) return res.status(404).json({ message: "Skill no encontrada." });

    const variant = skill.variants.find(v => v.variantKey === variantKey);
    if (!variant) return res.status(404).json({ message: "Variante no encontrada." });

    const { name, type, difficulty, stats, staticAu, dynamicAu, progressionLevel  } = req.body;

    const allowedTypes = ["static", "dynamic", "basic"];
    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ message: "type inválido." });
    }

    const allowedStatFields = [
        "pointsPerSecond",
        "energyPerSecond",
        "pointsPerRep",
        "energyPerRep",
        "staticAu",
        "dynamicAu"
      ];

      if (stats) {
        Object.keys(stats).forEach(key => {
          if (!allowedStatFields.includes(key)) {
            return res.status(400).json({
              message: `Campo de stats no permitido: ${key}`
            });
          }
        });
        Object.assign(variant.stats, stats);
      }

    const allowedVariantDifficulties = [
      "basic",
      "intermediate",
      "advanced",
      "elite",
      "legendary"
    ];

    if (progressionLevel !== undefined) {
        if (progressionLevel < 1 || progressionLevel > 4) {
          return res.status(400).json({ message: "progressionLevel debe estar entre 1 y 4." });
        }
        variant.progressionLevel = progressionLevel;
      }

    if (difficulty && !allowedVariantDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: "difficulty inválido." });
    }

    if (name) variant.name = name;
    if (type) variant.type = type;
    if (difficulty) variant.difficulty = difficulty;
    if (stats) {
  Object.assign(variant.stats, stats);
}
    if (staticAu !== undefined) variant.staticAu = staticAu;
    if (dynamicAu !== undefined) variant.dynamicAu = dynamicAu;

    variant.lastStatChange = new Date();

    await skill.save();

    const userSkills = await UserSkill.find({ skill: skill._id });
    for (const us of userSkills) {
      await recalculateUserStats(us.user);
    }

    res.json(skill);
  } catch (error) {
     console.error("Error actualizando variante:", error); 
    res.status(500).json({ message: "Error actualizando variante." });
  }
};


export const deleteVariant = async (req, res) => {
  try {
    const { skillKey, variantKey } = req.params;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) return res.status(404).json({ message: "Skill no encontrada." });

    const newVariants = skill.variants.filter(v => v.variantKey !== variantKey);

    if (newVariants.length === skill.variants.length) {
      return res.status(404).json({ message: "Variante no encontrada." });
    }

    skill.variants = newVariants;
    await skill.save();

    const userSkills = await UserSkill.find({ 
  skill: skill._id,
  "variants.variantKey": variantKey 
});

for (const us of userSkills) {
  await recalculateUserStats(us.user);
}

    res.json({ message: "Variante eliminada correctamente." });
  } catch (error) {
      console.error("Error eliminando variante:", error); 
    res.status(500).json({ message: "Error eliminando variante." });
  }
};

export const getAllVariants = async (req, res) => {
  try {
    const { skillKey } = req.params;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) return res.status(404).json({ message: "Skill no encontrada." });

    res.json(skill.variants);
  } catch (error) {
     console.error("Error obteniendo variantes:", error); 
    res.status(500).json({ message: "Error obteniendo variantes." });
  }
};


export const getVariantByKey = async (req, res) => {
  try {
    const { skillKey, variantKey } = req.params;

    const skill = await Skill.findOne({ skillKey });
    if (!skill) return res.status(404).json({ message: "Skill no encontrada." });

    const variant = skill.variants.find((v) => v.variantKey === variantKey);
    if (!variant) return res.status(404).json({ message: "Variante no encontrada." });

    res.json(variant);
  } catch (error) {
     console.error("Error obteniendo variante:", error); 
    res.status(500).json({ message: "Error obteniendo variante." });
  }
};