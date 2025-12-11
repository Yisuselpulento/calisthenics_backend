import User from "../models/user.model.js";
import Combo from "../models/combo.model.js";
import Match from "../models/match.model.js";

import { calculateComboStats } from "../utils/calculateComboStats.js";

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
    const [userACombo, userBCombo] = await Promise.all([
      Combo.findById(userAFavoriteComboId)
        .populate("user", "username avatar"),

      Combo.findById(userBFavoriteComboId)
        .populate("user", "username avatar"),
    ]);

    if (!userACombo || !userBCombo) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron los combos favoritos.",
      });
    }

    /* ----------------------------------------
     * 5️⃣ Calcular puntos y energía de ambos combos 🔥
     * ---------------------------------------- */
    const userAResult = calculateComboStats(userACombo.elements, "Usuario A");
const userBResult = calculateComboStats(userBCombo.elements, "Usuario B");

    /* ----------------------------------------
     * 6️⃣ Respuesta final
     * ---------------------------------------- */
   return res.status(200).json({
  success: true,
  userCombo: userACombo,
  opponentCombo: userBCombo,
  userAResult,
  userBResult
});

  } catch (error) {
    console.error("❌ Error en doMatch:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor.",
    });
  }
};
