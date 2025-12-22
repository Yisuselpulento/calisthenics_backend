import Challenge from "../models/challenge.model.js";
import User from "../models/user.model.js";
import Match from "../models/match.model.js";
import Notification from "../models/notification.model.js";
import { emitToUser } from "../Sockets/matchSockets.js";
import { getIO } from "../Sockets/io.js";
import MatchService from "../services/match.service.js";
import { cleanupChallenge } from "../utils/cleanupChallenge.js";
import { syncChallengeUsers } from "../utils/syncChallengeUsers.js";


/* ---------------------- HELPERS ---------------------- */

const getExpireTime = (matchType, isRematch = false) => {
  if (isRematch) return 15 * 1000;
  if (matchType === "ranked") return 30 * 1000;
  return 10 * 1000; // casual
};

/* ---------------------- CREATE CHALLENGE ---------------------- */

export const createChallenge = async (req, res) => {
  const fromUserId = req.userId;
  const { toUserId, type, matchType = "casual", rematchOf = null } = req.body;

  try {
    if (!toUserId || !type) {
      return res.status(400).json({
        success: false,
        message: "Datos incompletos",
      });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: "No puedes desafiarte a ti mismo",
      });
    }

    if (!["static", "dynamic"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de duelo inválido",
      });
    }

    if (!["casual", "ranked"].includes(matchType)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de match inválido",
      });
    }

    // ❌ Bloquear si alguno tiene challenge pendiente
    const pendingExists = await Challenge.exists({
      status: "pending",
      $or: [
        { fromUser: fromUserId },
        { toUser: fromUserId },
        { fromUser: toUserId },
        { toUser: toUserId },
      ],
    });

    if (pendingExists) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un desafío pendiente",
      });
    }

    const expireMs = getExpireTime(matchType, Boolean(rematchOf));

    const expiresAt = new Date(Date.now() + expireMs);

    const challenge = await Challenge.create({
      fromUser: fromUserId,
      toUser: toUserId,
      type,
      matchType,
      expiresAt,
      rematchOf,
    });

    // 🔔 crear notificación
   const notification = await Notification.create({
  user: toUserId,
  fromUser: fromUserId,
  type: "challenge",
  message: "Te han enviado un desafío",
  challenge: challenge._id,        // ✅ ObjectId real
  actions: ["accept", "reject"],
});

        await User.updateOne(
        { _id: toUserId },
        {
          hasPendingChallenge: true,
          pendingChallenge: challenge._id,
          lastChallengeAt: new Date(),
          $inc: { notificationsCount: 1 },
          $push: { notifications: notification._id },
        }
      );

      // 👤 Usuario que envía (sin notificación)
      await User.updateOne(
        { _id: fromUserId },
        {
          hasPendingChallenge: true,
          pendingChallenge: challenge._id,
          lastChallengeAt: new Date(),
        }
      );

    // 🔔 Notificar al usuario receptor
        const io = getIO();

       emitToUser(io, toUserId, "newChallenge", { notification });

     await syncChallengeUsers(challenge);

      setTimeout(async () => {
  try {
    const pendingChallenge = await Challenge.findById(challenge._id);

    if (!pendingChallenge || pendingChallenge.status !== "pending") {
      return;
    }

        pendingChallenge.status = "expired";
        await pendingChallenge.save();

        await cleanupChallenge(pendingChallenge);
        await syncChallengeUsers(pendingChallenge);

        emitToUser(io, fromUserId, "challengeExpired", {
          challengeId: challenge._id,
        });

      } catch (error) {
        console.error("Error en challenge expiration timeout:", error);
      }
    }, expireMs);

    return res.status(201).json({
      success: true,
      message: "Desafío enviado",
      challengeId: challenge._id,
    });
  } catch (error) {
    console.error("Error en createChallenge:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};

/* ---------------------- RESPOND CHALLENGE ---------------------- */

export const respondChallenge = async (req, res) => {
  const userId = req.userId;
  const { challengeId, accepted } = req.body;

  try {
    /* ---------------------- 1. OBTENER CHALLENGE ---------------------- */

    const challenge = await Challenge.findById(challengeId);

    if (!challenge || challenge.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Desafío no encontrado o no válido",
      });
    }

    /* ---------------------- 2. AUTORIZACIÓN ---------------------- */

    if (challenge.toUser.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "No autorizado",
      });
    }

     const io = getIO();

    /* ---------------------- 3. RECHAZADO ---------------------- */

    if (!accepted) {
      challenge.status = "rejected";
      await challenge.save();

      await cleanupChallenge(challenge);
      await syncChallengeUsers(challenge);

      emitToUser(io, challenge.fromUser, "challengeResponded", {
        challengeId: challenge._id,
        accepted: false,
      });

      return res.status(200).json({
        success: true,
        message: "Desafío rechazado",
      });
    }

    /* ---------------------- 4. ACEPTADO ---------------------- */

    // 🔐 Snapshot ELO solo si es ranked
    if (challenge.matchType === "ranked") {
      const fromUser = await User.findById(challenge.fromUser);
      const toUser = await User.findById(challenge.toUser);

      challenge.eloSnapshot = {
        fromUser: fromUser.ranking.elo,
        toUser: toUser.ranking.elo,
      };

      if (!challenge.eloSnapshot) {
        throw new Error("Ranked sin eloSnapshot");
      }
    }

    challenge.status = "accepted";
    await challenge.save();

    /* ---------------------- 5. CREAR MATCH ---------------------- */

    const matchResult = await MatchService.createMatchFromChallenge(challenge);

    challenge.matchId = matchResult.match._id;
    challenge.status = "completed";
    await challenge.save();

    /* ---------------------- 6. LIMPIEZA ---------------------- */

    await cleanupChallenge(challenge);
    await syncChallengeUsers(challenge);

    /* ---------------------- 7. SOCKETS ---------------------- */

    emitToUser(io, challenge.fromUser, "challengeResponded", {
      challengeId: challenge._id,
      accepted: true,
    });


    /* ---------------------- 8. RESPONSE ---------------------- */

    return res.status(200).json({
      success: true,
      message: "Desafío aceptado",
      challenge,
      matchResult,
    });

  } catch (error) {
    console.error("Error en respondChallenge:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

/* ---------------------- CANCEL CHALLENGE ---------------------- */

export const cancelChallenge = async (req, res) => {
  const userId = req.userId;
  const { challengeId } = req.params;

  try {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge || challenge.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Desafío no encontrado",
      });
    }

    if (challenge.fromUser.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "No autorizado",
      });
    }

    challenge.status = "cancelled";
    await challenge.save();

    
    await cleanupChallenge(challenge);
    await syncChallengeUsers(challenge);

    const io = getIO();

    emitToUser(io, challenge.fromUser, "challengeCancelled", {
  challengeId: challenge._id,
});

    res.status(200).json({
      success: true,
      message: "Desafío cancelado",
    });
  } catch (error) {
    console.error("Error en cancelChallenge:", error);
     return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};
