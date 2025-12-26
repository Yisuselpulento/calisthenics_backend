import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import Combo from "../models/combo.model.js";

export const getMatchByIdController = async (req, res) => {
  const { matchId } = req.params;

  try {
    const match = await Match.findById(matchId)
      .populate("playerData.user", "username avatar stats")
      .populate("playerData.combo");

    if (!match) {
      return res.status(404).json({ success: false, message: "Match no encontrado" });
    }

    const userId = req.user._id.toString();
    const isPlayer = match.players.some(p => p.toString() === userId);

    if (!isPlayer) {
      return res.status(403).json({ success: false, message: "No tienes permiso para ver este match" });
    }

    const [playerAData, playerBData] = match.playerData;

    const getPlayerResult = async (player) => {
      let combo = player.combo;
      let result;

      if (player.breakdown?.elementsStepData) {
        // Ya calculado en el match
        result = {
          totalPoints: player.points,
          stepData: player.breakdown.elementsStepData,
          energySpent: player.energySpent,
        };
      } else {
        // Recalcular usando la función unificada
        const calculation = await calculateMatchResults(player.user, match.mode);
        combo = calculation.combo;
        result = {
          totalPoints: calculation.totalPoints,
          stepData: calculation.stepData,
          energySpent: player.energySpent || 0,
        };
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

    return res.status(200).json({
      success: true,
      match: {
        user,
        opponent,
        mode: match.mode,
        matchType: match.matchType,
        totalPointsDiff: match.points,
        createdAt: match.createdAt,
      },
    });

  } catch (error) {
    console.error("Error en getMatchByIdController:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
};

const getPlayerSnapshot = (match, userId) => {
  return match.playerData.find((p) => {
    const id = p.user._id ? p.user._id.toString() : p.user.toString();
    return id === userId.toString();
  });
};

const getOpponentSnapshot = (match, userId) => {
  return match.players.find((p) => {
    const id = p._id ? p._id.toString() : p.toString();
    return id !== userId.toString();
  }) || {};
};

// ------------------- USER HISTORIES -------------------
export const getUserRankedHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const matches = await Match.find({
      players: userId,
      matchType: "ranked",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("players", "username avatar")
      .populate("playerData.combo", "name type")
      .lean();

    const history = matches.map((match) => {
      const me = getPlayerSnapshot(match, userId);
      const opponent = getOpponentSnapshot(match, userId);

      return {
        _id: match._id,
        createdAt: match.createdAt,
        mode: match.mode,
        result: me?.result,
        points: me?.points,
        eloBefore: me?.eloBefore,
        eloAfter: me?.eloAfter,
        energySpent: me?.energySpent,
        combo: me?.combo,
        opponent: {
          username: opponent?.username || "Desconocido",
          avatar: opponent?.avatar || null,
        },
      };
    });

    return res.status(200).json({ success: true, matches: history });
  } catch (error) {
    console.error("Error user ranked history:", error);
    return res.status(500).json({
      success: false,
      message: "Error obteniendo historial del usuario",
    });
  }
};

export const getUserCasualHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const matches = await Match.find({
      players: userId,
      matchType: "casual",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("players", "username avatar")
      .populate("playerData.combo", "name type")
      .lean();

    const history = matches.map((match) => {
      const me = getPlayerSnapshot(match, userId);
      const opponent = getOpponentSnapshot(match, userId);

      return {
        _id: match._id,
        createdAt: match.createdAt,
        mode: match.mode,
        result: me?.result,
        points: me?.points,
        energySpent: me?.energySpent,
        combo: me?.combo,
        opponent: {
          username: opponent?.username || "Desconocido",
          avatar: opponent?.avatar || null,
        },
      };
    });

    return res.status(200).json({ success: true, matches: history });
  } catch (error) {
    console.error("Error user casual history:", error);
    return res.status(500).json({
      success: false,
      message: "Error obteniendo historial del usuario",
    });
  }
};