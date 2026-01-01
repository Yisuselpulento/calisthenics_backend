import User from "../models/user.model.js";
import { emitToUser } from "./emit.js";
import crypto from "crypto";

import { validateRankedSearch } from "../ranked/rankedValidators.js";
import { findOrQueuePlayer, removeFromQueue } from "../ranked/rankedService.js";
import {
  startAcceptCheck,
  confirmAccept,
  cancelAcceptCheck,
} from "../ranked/rankedReadyCheck.js";
import {
  lockUser,
  unlockUser,
  isUserLocked,
} from "../ranked/rankedLocks.js";
import { startRankedMatch } from "../ranked/rankedMatchOrchestrator.js";
import { rankedSessions } from "../ranked/rankedSessions.js";
import { applyEnergyRegen } from "../services/energy.service.js";

const RANKED_ENERGY_COST = 333;

const pendingMatches = new Map();
// matchId -> { players: [idA, idB], mode }

export const initRankedSockets = (io, socket) => {
  /* =========================
     BUSCAR RANKED
  ========================== */
  socket.on("ranked:search", async ({ mode }) => {
    const userId = socket.userId;
    if (!userId) return;
    if (!["static", "dynamic"].includes(mode)) return;

    const key = userId.toString();

    if (rankedSessions.has(key)) return;
    if (isUserLocked(userId)) return;

    lockUser(userId, { ttl: 30000 });

    try {
      const user = await User.findById(userId);
      if (!user) {
        unlockUser(userId);
        return;
      }

      if (user.stats.energy < RANKED_ENERGY_COST) {
        unlockUser(userId);
        emitToUser(io, userId, "ranked:error", {
          message: "Energía insuficiente para jugar ranked",
        });
        return;
      }

      await user.save();

      // ✅ VALIDACIÓN NEGOCIO
      const combo = await validateRankedSearch(user, mode);

      // 🆔 SESIÓN
      const sessionId = crypto.randomUUID();
      rankedSessions.set(key, sessionId);

      const player = {
        userId,
        sessionId,
        elo: user.ranking[mode]?.elo,
        comboId: combo._id,
      };

      console.log(`🔍 ${userId} buscando ranked ${mode}`);

      const opponent = findOrQueuePlayer({ mode, player });

      // ❌ A COLA
      if (!opponent) return;

      removeFromQueue(mode, player.userId, player.sessionId);
     removeFromQueue(mode, opponent.userId, opponent.sessionId);

      // ✅ MATCH
      const matchId = `${player.userId}_${opponent.userId}_${Date.now()}`;

      pendingMatches.set(matchId, {
        players: [player.userId, opponent.userId],
        mode,
      });

      [player.userId, opponent.userId].forEach((uid, i) => {
        emitToUser(io, uid, "ranked:found", {
          opponentId: i === 0 ? opponent.userId : player.userId,
          matchId,
          mode,
        });

        emitToUser(io, uid, "ranked:readyCheck", {
          matchId,
          timeout: 10000,
        });
      });

      startAcceptCheck(io, matchId, [
        player.userId,
        opponent.userId,
      ]);
    } catch (err) {
      console.error("❌ ranked:search", err.message);
      unlockUser(userId);

      emitToUser(io, userId, "ranked:error", {
        message: err.message,
      });
    }
  });

  /* =========================
     ACEPTAR MATCH
  ========================== */
  socket.on("ranked:accept", async ({ matchId }) => {
  const userId = socket.userId;
  if (!userId) return;

  const match = pendingMatches.get(matchId);
  if (!match || !match.players.includes(userId)) {
    return;
  }

  const accepted = confirmAccept(io, matchId, userId);
  if (!accepted) return;

  try {
    const result = await startRankedMatch({
      players: match.players,
      mode: match.mode,
    });

    const realMatchId = result.match._id.toString();

    match.players.forEach((uid) => {
      rankedSessions.delete(uid.toString());
      unlockUser(uid);

      emitToUser(io, uid, "ranked:started", {
        matchId: realMatchId,
        mode: match.mode,
      });
    });

    pendingMatches.delete(matchId);
  } catch (err) {
    console.error("❌ Ranked start error", err.message);

    match.players.forEach((uid) => {
      rankedSessions.delete(uid.toString());
      unlockUser(uid);

      emitToUser(io, uid, "ranked:cancelled", {
        reason: "error",
      });
    });

    pendingMatches.delete(matchId);
  }
});

  /* =========================
     CANCELAR BÚSQUEDA
  ========================== */
  socket.on("ranked:cancel", ({ mode }) => {
    const userId = socket.userId;
    if (!userId || !mode) return;

    const key = userId.toString();
    const sessionId = rankedSessions.get(key);
    if (!sessionId) return;

    removeFromQueue(mode, userId, sessionId);
    rankedSessions.delete(key);
    unlockUser(userId);
  });

  /* =========================
     DISCONNECT
  ========================== */
  socket.on("disconnect", () => {
    const userId = socket.userId;
    if (!userId) return;

    const key = userId.toString();
    const sessionId = rankedSessions.get(key);
    if (!sessionId) return;

    ["static", "dynamic"].forEach((mode) => {
      removeFromQueue(mode, userId, sessionId);
    });

    for (const [matchId, match] of pendingMatches) {
      if (match.players.includes(userId)) {
        cancelAcceptCheck(io, matchId, match.players);
        pendingMatches.delete(matchId);
      }
    }

    rankedSessions.delete(key);
    unlockUser(userId);

    emitToUser(io, userId, "ranked:cancelled", {
      reason: "disconnect",
    });
  });
};
