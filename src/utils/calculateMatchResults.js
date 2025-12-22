import { calculateComboPointsStepByStep } from "../utils/calculateComboStats.js";
import { populateComboWithFingers } from "../utils/populateComboWithFingers.js";
import Combo from "../models/combo.model.js";

export const calculateMatchResults = async (user, mode) => {
  const userFavCombo = await Combo
    .findById(user.favoriteCombos[mode])
    .populate("user", "username avatar");

  if (!userFavCombo) {
    throw new Error("Combo favorito no encontrado");
  }

  const populatedCombo = await populateComboWithFingers(userFavCombo);

  const result = calculateComboPointsStepByStep(
    populatedCombo.elements,
    user.stats.energy 
  );

  return {
    combo: populatedCombo,
    totalPoints: result.totalPoints,
    stepData: result.elementsStepData,
    breakdown: result.breakdown,
  };
};

