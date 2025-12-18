import Skill from "../models/skill.model.js";


export const createSkill = async (req, res) => {
  try {
    const { name, skillKey, difficulty } = req.body;

    if (!name || !skillKey) {
      return res.status(400).json({
        success: false,
        message: "name y skillKey son requeridos.",
      });
    }

    const allowedDifficulties = ["easy", "medium", "hard"];
    if (difficulty && !allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "difficulty inválido.",
      });
    }

    const keyExists = await Skill.findOne({ skillKey });
    if (keyExists) {
      return res.status(400).json({
        success: false,
        message: "skillKey ya está en uso.",
      });
    }

    const skill = await Skill.create({ name, skillKey, difficulty });

    return res.status(201).json({
      success: true,
      message: "Skill creada correctamente.",
      data: skill,
    });
  } catch (error) {
    console.error("Error creating skill:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};



export const getAllSkills = async (req, res) => {
  try {
    const skills = await Skill.find();

    return res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error("Error get all skills:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};



export const getSkillByKey = async (req, res) => {
  try {
    const { skillKey } = req.params;

    const skill = await Skill.findOne({ skillKey });

    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada.",
      });
    }

    return res.json({
      success: true,
      data: skill,
    });
  } catch (error) {
    console.error("Error get by key:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};




export const updateSkill = async (req, res) => {
  try {
    const { skillKey } = req.params;
    const { name, difficulty } = req.body;

    const allowedDifficulties = ["easy", "medium", "hard"];
    if (difficulty && !allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "difficulty inválido.",
      });
    }

    const skill = await Skill.findOne({ skillKey });

    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada.",
      });
    }

    if (name) skill.name = name;
    if (difficulty) skill.difficulty = difficulty;

    await skill.save();

    return res.json({
      success: true,
      message: "Skill actualizada correctamente.",
      data: skill,
    });
  } catch (error) {
    console.error("Error update skill:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};



export const deleteSkill = async (req, res) => {
  try {
    const { skillKey } = req.params;

    const skill = await Skill.findOneAndDelete({ skillKey });

    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill no encontrada.",
      });
    }

    return res.json({
      success: true,
      message: "Skill eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error delete skill", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

