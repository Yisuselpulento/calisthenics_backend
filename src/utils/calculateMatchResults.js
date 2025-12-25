// utils/calculateMatchResults.js
import { calculateComboPointsStepByStep } from "./calculateComboStats.js";
import { populateComboWithFingers } from "./populateComboWithFingers.js";
import Combo from "../models/combo.model.js";

/**
 * Calcula los resultados de un usuario en un match, casual o ranked.
 * @param {Object} user - Documento de usuario
 * @param {string} mode - "static" | "dynamic" (tipo de match)
 */
export const calculateMatchResults = async (user, mode) => {
  if (!user.favoriteCombos[mode]) {
    throw new Error("No hay combo favorito asignado para este modo");
  }

  const combo = await Combo.findById(user.favoriteCombos[mode]).populate("user", "username avatar");
  if (!combo) throw new Error("Combo favorito no encontrado");

  const populatedCombo = await populateComboWithFingers(combo);

  const result = calculateComboPointsStepByStep(populatedCombo.elements, user.stats.energy);

  return {
    combo: populatedCombo,
    totalPoints: result.totalPoints,
    stepData: result.elementsStepData,
    breakdown: result.breakdown,
  };
};
