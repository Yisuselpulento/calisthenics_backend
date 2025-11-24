import Skill from "../models/skill.model.js";


export const addVariant = async (req, res) => {
  try {
    const { skillKey } = req.params;
    const { name, variantKey, type, difficulty, stats, staticAu, dynamicAu } = req.body;

    const skill = await Skill.findOne({ skillKey });

    if (!skill) {
      return res.status(404).json({ message: "Skill no encontrada." });
    }

    // validaciones
    if (!name || !variantKey || !type) {
      return res.status(400).json({ message: "name, variantKey y type son requeridos." });
    }

    const allowedTypes = ["static", "dynamic"];
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
      stats: stats ?? {}
    });

    await skill.save();

    res.status(201).json(skill);
  } catch (error) {
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

    const { name, type, difficulty, stats, staticAu, dynamicAu } = req.body;

    const allowedTypes = ["static", "dynamic"];
    if (type && !allowedTypes.includes(type)) {
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
      return res.status(400).json({ message: "difficulty inválido." });
    }

    if (name) variant.name = name;
    if (type) variant.type = type;
    if (difficulty) variant.difficulty = difficulty;
    if (stats) variant.stats = stats;
    if (staticAu !== undefined) variant.staticAu = staticAu;
    if (dynamicAu !== undefined) variant.dynamicAu = dynamicAu;

    await skill.save();

    res.json(skill);
  } catch (error) {
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

    res.json({ message: "Variante eliminada correctamente." });
  } catch (error) {
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
    res.status(500).json({ message: "Error obteniendo variante." });
  }
};