import { rankedQueue } from "../ranked/rankedQueue.js";
import { emitToUser } from "./emit.js";
import { startReadyCheck, confirmReady } from "../ranked/rankedReadyCheck.js";
import User from "../models/user.model.js";

const pendingMatches = new Map();
// matchId -> { players: [idA, idB] }

export const initRankedSockets = (io, socket) => {

  socket.on("ranked:search", async ({ mode }) => {
    const userId = socket.userId;
    const user = await User.findById(userId);
    if (!user || !user.rankingUnlocked) return;

    const player = {
      userId,
      elo: user.ranking.elo,
    };

    const queue = rankedQueue[mode];

    const opponent = queue.find(p =>
      Math.abs(p.elo - player.elo) <= 100
    );

    if (opponent) {
      rankedQueue[mode] = queue.filter(p => p.userId !== opponent.userId);

      const matchId = `${player.userId}_${opponent.userId}_${Date.now()}`;

      pendingMatches.set(matchId, {
        players: [player.userId, opponent.userId],
        mode,
      });

      emitToUser(io, player.userId, "ranked:found", {
        opponentId: opponent.userId,
        matchId,
      });

      emitToUser(io, opponent.userId, "ranked:found", {
        opponentId: player.userId,
        matchId,
      });

      startReadyCheck(io, matchId, [player.userId, opponent.userId]);
    } else {
      queue.push(player);
    }
  });

  socket.on("ranked:accept", ({ matchId }) => {
    const match = pendingMatches.get(matchId);
    if (!match) return;

    const ready = confirmReady(io, matchId, socket.userId);

    if (ready) {
      // ✅ ambos aceptaron
      pendingMatches.delete(matchId);

      // aquí luego creamos el Match real
      // createRankedMatch(match.players, match.mode)
    }
  });

  socket.on("ranked:cancel", ({ mode }) => {
    rankedQueue[mode] = rankedQueue[mode].filter(
      p => p.userId !== socket.userId
    );
  });
};
