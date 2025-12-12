import User from "../models/user.model.js";
import Combo from "../models/combo.model.js";
import UserSkill from "../models/userSkill.model.js";
import { calculateComboPointsStepByStep } from "../utils/calculateComboStats.js";

const populateComboWithFingers = async (combo) => {
  const elementsWithFingers = await Promise.all(
    combo.elements.map(async (el) => {
      // Buscar la variante correspondiente en UserSkill
      const userSkill = await UserSkill.findOne(
        { "variants._id": el.userSkillVariantId },
        { "variants.$": 1 } // traer solo la variante que necesitamos
      ).lean();

      let fingers = 5; // valor por defecto
      if (userSkill?.variants?.length > 0) {
        fingers = userSkill.variants[0].fingers;
      }

      return {
        ...el.toObject(), // todo lo que ya tenía el elemento
        fingers,         // agregar solo fingers
      };
    })
  );

  return {
    ...combo.toObject(),
    elements: elementsWithFingers,
  };
};

export const doMatch = async (req, res) => {
  try {
    const userAId = req.userId;
    const { opponentId, type, matchType = "casual" } = req.body;

    /* ----------------------------------------
     * 1️⃣ Validar datos del body
     * ---------------------------------------- */
    if (!opponentId || !type) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos: opponentId y type son requeridos.",
      });
    }

    /* ----------------------------------------
     * 2️⃣ Validar existencia de los usuarios
     * ---------------------------------------- */
    const [userA, userB] = await Promise.all([
      User.findById(userAId),
      User.findById(opponentId),
    ]);

    if (!userA) {
      return res.status(404).json({
        success: false,
        message: "Usuario que inicia el match no existe.",
      });
    }

    if (!userB) {
      return res.status(404).json({
        success: false,
        message: "El usuario oponente no existe.",
      });
    }

    /* ----------------------------------------
     * 3️⃣ Validar que ambos tengan combo favorito del tipo indicado
     * ---------------------------------------- */
    const userAFavoriteComboId = userA.favoriteCombos?.[type] || null;
    const userBFavoriteComboId = userB.favoriteCombos?.[type] || null;

    if (!userAFavoriteComboId) {
      return res.status(400).json({
        success: false,
        message: `El usuario no tiene un combo favorito de tipo ${type}.`,
      });
    }

    if (!userBFavoriteComboId) {
      return res.status(400).json({
        success: false,
        message: `El oponente no tiene un combo favorito de tipo ${type}.`,
      });
    }

    /* ----------------------------------------
     * 4️⃣ Obtener combos completos
     * ---------------------------------------- */
    const [userAComboRaw, userBComboRaw] = await Promise.all([
      Combo.findById(userAFavoriteComboId).populate("user", "username avatar"),
      Combo.findById(userBFavoriteComboId).populate("user", "username avatar"),
    ]);

    if (!userAComboRaw || !userBComboRaw) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron los combos favoritos.",
      });
    }

    /* ----------------------------------------
     * 5️⃣ Completar combos con fingers
     * ---------------------------------------- */
    const [userACombo, userBCombo] = await Promise.all([
      populateComboWithFingers(userAComboRaw),
      populateComboWithFingers(userBComboRaw),
    ]);

    /* ----------------------------------------
     * 6️⃣ Calcular puntos
     * ---------------------------------------- */
    const userAResult = calculateComboPointsStepByStep(userACombo.elements, userA.stats.energy);
    const userBResult = calculateComboPointsStepByStep(userBCombo.elements, userB.stats.energy);

    const userAWinner = userAResult.totalPoints >= userBResult.totalPoints;
    const userBWinner = !userAWinner;

    /* ----------------------------------------
     * 7️⃣ Respuesta final
     * ---------------------------------------- */
    return res.status(200).json({
      success: true,
      userCombo: userACombo,
      opponentCombo: userBCombo,
      userAResult: { ...userAResult, isWinner: userAWinner },
      userBResult: { ...userBResult, isWinner: userBWinner },
    });

  } catch (error) {
    console.error("❌ Error en doMatch:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor.",
    });
  }
};
