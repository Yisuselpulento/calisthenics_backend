// utils/calculateMatchResults.js
import { calculateComboPointsStepByStep } from "../utils/calculateComboStats.js";
import { populateComboWithFingers } from "../utils/populateComboWithFingers.js";
import Combo from "../models/combo.model.js";

export const calculateMatchResults = async (user, matchType) => {
  // Obtener el combo favorito del jugador
  const userFavCombo = await Combo.findById(user.favoriteCombos[matchType]).populate("user", "username avatar");

  // Completar combo con fingers
  const populatedCombo = await populateComboWithFingers(userFavCombo);

  // Calcular puntos
  const result = calculateComboPointsStepByStep(populatedCombo.elements, user.stats.energy);

  return {
    combo: populatedCombo,
    totalPoints: result.totalPoints,
    energySpent: result.totalEnergy,
    stepData: result.elementsStepData,
    breakdown: result.breakdown,
  };
};
