import User from "../models/user.model.js";
import { emitToUser } from "./emit.js";

import { validateRankedSearch } from "../ranked/rankedValidators.js";
import { findOrQueuePlayer, removeFromQueue  } from "../ranked/rankedService.js";
import {
  startAcceptCheck,
  confirmAccept,
  cancelAcceptCheck
} from "../ranked/rankedReadyCheck.js";
import {
  lockUser,
  unlockUser,
  isUserLocked,
} from "../ranked/rankedLocks.js";
import { startRankedMatch } from "../ranked/rankedMatchOrchestrator.js";

const pendingMatches = new Map();
// matchId -> { players: [idA, idB], mode }

export const initRankedSockets = (io, socket) => {

  /* =========================
     BUSCAR RANKED
  ========================== */
  socket.on("ranked:search", async ({ mode }) => {
  

    try {
      const userId = socket.userId;
      if (!userId) return;

      if (isUserLocked(userId)) {
        console.log(`⛔ ${userId} está esperando aceptación`);
        return;
      }

      if (!["static", "dynamic"].includes(mode)) return;

      const user = await User.findById(userId);
      if (!user) return;

      // ✅ Validación de negocio
      const combo = await validateRankedSearch(user, mode);

      const player = {
        userId,
         elo: user.ranking[mode]?.elo,
        comboId: combo._id,
      };

      console.log(`🔍 ${userId} buscando ranked ${mode}`);

      // ✅ Matchmaking centralizado
      const opponent = findOrQueuePlayer({ mode, player });

      // ❌ No hay rival → queda en cola
      if (!opponent) {
        console.log(`🕒 ${userId} en cola ${mode}`);
        return;
      }

      // ✅ MATCH ENCONTRADO
      const matchId = `${player.userId}_${opponent.userId}_${Date.now()}`;

      pendingMatches.set(matchId, {
        players: [player.userId, opponent.userId],
        mode,
      });

      console.log("⚔️ Match encontrado:", matchId);

      emitToUser(io, player.userId, "ranked:found", {
        opponentId: opponent.userId,
        matchId,
        mode,
      });

      emitToUser(io, opponent.userId, "ranked:found", {
        opponentId: player.userId,
        matchId,
        mode,
      });

      emitToUser(io, player.userId, "ranked:readyCheck", {
          matchId,
          timeout: 10000,
        });

      emitToUser(io, opponent.userId, "ranked:readyCheck", {
        matchId,
        timeout: 10000,
      });

      // ✅ UN SOLO CHECK DE ACEPTACIÓN (10s)
      startAcceptCheck(io, matchId, [
        player.userId,
        opponent.userId,
      ]);

    } catch (err) {
      console.error("❌ ranked:search", err.message);

      emitToUser(io, socket.userId, "ranked:error", {
        message: err.message,
      });
    }
  });

  /* =========================
     ACEPTAR MATCH
  ========================== */
  socket.on("ranked:accept", async ({ matchId }) => {
  const match = pendingMatches.get(matchId);
  if (!match) return;
  if (!match.players.includes(socket.userId)) return;

  lockUser(socket.userId);

  const accepted = confirmAccept(io, matchId, socket.userId);
  if (!accepted) return;

  try {
    const result = await startRankedMatch({
      players: match.players,
      mode: match.mode,
    });

    const realMatchId = result.match._id.toString();

    match.players.forEach((userId) => {
      emitToUser(io, userId, "ranked:started", {
        matchId: realMatchId,
        mode: match.mode,
      });
      unlockUser(userId);
    });

    pendingMatches.delete(matchId);

  } catch (err) {
    console.error("❌ Ranked start error", err.message);

    match.players.forEach((userId) => {
      emitToUser(io, userId, "ranked:cancelled", {
        reason: "error",
      });
      unlockUser(userId);
    });

    pendingMatches.delete(matchId);
  }
});

  /* =========================
     CANCELAR BÚSQUEDA
  ========================== */
  socket.on("ranked:cancel", ({ mode }) => {
  if (!mode) return;

  removeFromQueue(mode, socket.userId);
  unlockUser(socket.userId);
});

  /* =========================
     DISCONNECT
  ========================== */
 socket.on("disconnect", () => {
  for (const [matchId, match] of pendingMatches) {
    if (match.players.includes(socket.userId)) {
      cancelAcceptCheck(io, matchId, match.players);
      pendingMatches.delete(matchId);
    }
  }
});


};
