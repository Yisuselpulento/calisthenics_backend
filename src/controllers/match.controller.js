import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import Combo from "../models/combo.model.js";
import { calculateComboPointsStepByStep } from "../utils/calculateComboStats.js";
import { populateComboWithFingers } from "../utils/populateComboWithFingers.js";

export const getMatchByIdController = async (req, res) => {
  const { matchId } = req.params;

  try {
    const match = await Match.findById(matchId)
      .populate("playerData.user", "username avatar")
      .populate("playerData.combo");

    if (!match) return res.status(404).json({ success: false, message: "Match no encontrado" });

    const [playerAData, playerBData] = match.playerData;

    const getPlayerResult = async (player) => {
      let combo = player.combo;
      let result;

      if (player.breakdown?.elementsStepData) {
        result = {
          totalPoints: player.points,
          stepData: player.breakdown.elementsStepData,
          energySpent: player.energySpent,
        };
      } else if (combo) {
        // Solo recalcular si no existe breakdown
        const populatedCombo = await populateComboWithFingers(await Combo.findById(combo));
        const calculation = calculateComboPointsStepByStep(populatedCombo.elements, player.user.stats?.energy || 0);
        combo = populatedCombo;
        result = {
          totalPoints: calculation.totalPoints,
          stepData: calculation.elementsStepData,
          energySpent: player.energySpent || 0,
        };
      } else {
        result = { totalPoints: 0, stepData: [], energySpent: 0 };
      }

      return {
        combo,
        totalPoints: result.totalPoints,
        stepData: result.stepData,
        energySpent: result.energySpent,
        isWinner: match.winner?.toString() === player.user._id.toString(),
        playerName: player.user.username,
        user: player.user,
      };
    };

    const [user, opponent] = await Promise.all([
      getPlayerResult(playerAData),
      getPlayerResult(playerBData),
    ]);

    res.json({
      success: true,
      match: {
        user,
        opponent,
        mode: match.mode,
        matchType: match.matchType,
        totalPointsDiff: match.points,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};
