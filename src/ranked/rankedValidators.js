import Combo from "../models/combo.model.js";

export const validateRankedSearch = async (user, mode) => {
  if (!user.rankingUnlocked) {
    throw new Error("Ranking bloqueado");
  }

  const comboId = user.favoriteCombos?.[mode];
  if (!comboId) {
    throw new Error(`No tienes combo favorito ${mode}`);
  }

  const combo = await Combo.findById(comboId);
  if (!combo || combo.type !== mode) {
    throw new Error("Combo inválido para este modo");
  }

  return combo;
};
