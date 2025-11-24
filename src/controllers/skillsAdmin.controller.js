import Skill from "../models/skill.model.js";


export const createSkill = async (req, res) => {
  try {
    const { name, skillKey, difficulty } = req.body;

    if (!name || !skillKey) {
      return res.status(400).json({ message: "name y skillKey son requeridos." });
    }

    // validar difficulty
    const allowedDifficulties = ["easy", "medium", "hard"];
    if (difficulty && !allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: "difficulty inválido." });
    }

    // validar que la key no exista
    const keyExists = await Skill.findOne({ skillKey });
    if (keyExists) {
      return res.status(400).json({ message: "skillKey ya está en uso." });
    }

    const skill = await Skill.create({ name, skillKey, difficulty });

    res.status(201).json(skill);
  } catch (error) {
    console.error("Error creating skill:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};


export const getAllSkills = async (req, res) => {
  try {
    const skills = await Skill.find();
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener skills." });
  }
};



export const getSkillByKey = async (req, res) => {
  try {
    const { skillKey } = req.params;

    const skill = await Skill.findOne({ skillKey });

    if (!skill) {
      return res.status(404).json({ message: "Skill no encontrada." });
    }

    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener skill." });
  }
};



export const updateSkill = async (req, res) => {
  try {
    const { skillKey } = req.params;
    const { name, difficulty } = req.body;

    const allowedDifficulties = ["easy", "medium", "hard"];
    if (difficulty && !allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: "difficulty inválido." });
    }

    const skill = await Skill.findOne({ skillKey });

    if (!skill) {
      return res.status(404).json({ message: "Skill no encontrada." });
    }

    if (name) skill.name = name;
    if (difficulty) skill.difficulty = difficulty;

    await skill.save();

    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: "Error actualizando skill." });
  }
};


export const deleteSkill = async (req, res) => {
  try {
    const { skillKey } = req.params;

    const skill = await Skill.findOneAndDelete({ skillKey });

    if (!skill) {
      return res.status(404).json({ message: "Skill no encontrada." });
    }

    res.json({ message: "Skill eliminada correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error eliminando skill." });
  }
};
