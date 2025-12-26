import User from "../models/user.model.js";
import RankedMatchService from "../services/rankedMatch.service.js";

export const startRankedMatch = async ({ players, mode }) => {
  const [userAId, userBId] = players;

  const [userA, userB] = await Promise.all([
    User.findById(userAId),
    User.findById(userBId),
  ]);

  if (!userA || !userB) {
    throw new Error("Usuarios no encontrados");
  }

  return RankedMatchService.createRankedMatch({
    userAId,
    userBId,
    type: mode,
    eloSnapshot: {
      userA: userA.ranking[mode]?.elo ?? 1000,  // <-- usar mode
    userB: userB.ranking[mode]?.elo ?? 1000,  // <-- usar mode
    },
  });
};
