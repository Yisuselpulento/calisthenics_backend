import Challenge from "../models/challenge.model.js";
import User from "../models/user.model.js";
import Match from "../models/match.model.js";
import Notification from "../models/notification.model.js";
import { emitToUser } from "../Sockets/matchSockets.js";
import { getIO } from "../Sockets/io.js";
import { getAuthUser } from "../utils/getAuthUser.js";
import MatchService from "../services/match.service.js";


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

    const expiresAt = new Date(
      Date.now() + getExpireTime(matchType, Boolean(rematchOf))
    );

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

    await User.updateMany(
  { _id: { $in: [fromUserId, toUserId] } },
  {
    hasPendingChallenge: true,
    pendingChallenge: challenge._id,
    lastChallengeAt: new Date(),
  }
);

// Agregar notificación solo al receptor
await User.findByIdAndUpdate(toUserId, {
  $inc: { notificationsCount: 1 },
  $push: { notifications: notification._id },
});

    // 🔔 Notificar al usuario receptor
        const io = getIO();

       emitToUser(io, toUserId, "newChallenge", { notification });

       const updatedToUser = await getAuthUser(toUserId);
    const updatedFromUser = await getAuthUser(fromUserId);

    emitToUser(io, toUserId, "userUpdated", { user: updatedToUser });
    emitToUser(io, fromUserId, "userUpdated", { user: updatedFromUser });

       setTimeout(async () => {
  const pendingChallenge = await Challenge.findById(challenge._id);
  if (pendingChallenge && pendingChallenge.status === "pending") {
    pendingChallenge.status = "cancelled";
    await pendingChallenge.save();

    // Eliminar notificación
    await Notification.deleteMany({ challenge: challenge._id });

    // Resetear pendingChallenge en ambos usuarios
    await User.updateMany(
      { _id: { $in: [fromUserId, toUserId] } },
      { hasPendingChallenge: false, pendingChallenge: null }
    );

    // 🔔 Notificar al usuario que envió el desafío
    emitToUser(io, fromUserId, "challengeExpired", {
      challengeId: challenge._id,
    });

       const updatedToUser = await getAuthUser(toUserId);
        const updatedFromUser = await getAuthUser(fromUserId);

        emitToUser(io, toUserId, "userUpdated", { user: updatedToUser });
        emitToUser(io, fromUserId, "userUpdated", { user: updatedFromUser });
  }
}, 10000);

    return res.status(201).json({
      success: true,
      message: "Desafío enviado",
      challengeId: challenge._id,
    });
  } catch (error) {
    console.error("Error en createChallenge:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor",
    });
  }
};

/* ---------------------- RESPOND CHALLENGE ---------------------- */

export const respondChallenge = async (req, res) => {
  const userId = req.userId;
  const { challengeId, accepted } = req.body;

  try {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge || challenge.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Desafío no encontrado o inválido",
      });
    }

    if (challenge.toUser.toString() !== userId.toString()) {
  return res.status(403).json({
    success: false,
    message: "No autorizado",
  });
}

    challenge.status = accepted ? "accepted" : "rejected";

    if (accepted && challenge.matchType === "ranked") {
      const fromUser = await User.findById(challenge.fromUser);
      const toUser = await User.findById(challenge.toUser);

      challenge.eloSnapshot = {
        fromUser: fromUser.ranking.elo,
        toUser: toUser.ranking.elo,
      };
    }

    let matchResult   = null;

     if (accepted) {
      matchResult = await MatchService.createMatchFromChallenge(challenge);
      challenge.status = "completed";
    }

    await challenge.save();

   await Notification.deleteMany({ challenge: challenge._id });
    await User.updateMany(
      { _id: { $in: [challenge.fromUser, challenge.toUser] } },
      {
        $pull: { notifications: challenge._id },
        hasPendingChallenge: false,
        pendingChallenge: null,
      }
    );

    const io = getIO();

// Emitir evento al creador del challenge
      emitToUser(io, challenge.fromUser, "challengeResponded", {
        challengeId: challenge._id,
        accepted, // true o false
      });

      const updatedToUser = await getAuthUser(challenge.toUser);
      const updatedFromUser = await getAuthUser(challenge.fromUser);

      emitToUser(io, challenge.toUser, "userUpdated", { user: updatedToUser });
      emitToUser(io, challenge.fromUser, "userUpdated", { user: updatedFromUser });

    return res.status(200).json({
      success: true,
      message: accepted
        ? "Desafío aceptado"
        : "Desafío rechazado",
      challenge,
      matchResult: matchResult || null,
    });
  } catch (error) {
    console.error("Error en respondChallenge:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor",
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

     await Notification.deleteMany({ challenge: challenge._id });
      await User.updateMany(
        { _id: { $in: [challenge.fromUser, challenge.toUser] } },
        {
          $pull: { notifications: challenge._id },
          hasPendingChallenge: false,
          pendingChallenge: null,
        }
      );

        const io = getIO();

    // Emitir actualización completa de usuario
    const updatedToUser = await getAuthUser(challenge.toUser);
    const updatedFromUser = await getAuthUser(challenge.fromUser);

    emitToUser(io, challenge.toUser, "userUpdated", { user: updatedToUser });
    emitToUser(io, challenge.fromUser, "userUpdated", { user: updatedFromUser });

    // Notificar al creador que el challenge fue cancelado
    emitToUser(io, challenge.fromUser, "challengeCancelled", { challengeId: challenge._id });

    res.status(200).json({
      success: true,
      message: "Desafío cancelado",
    });
  } catch (error) {
    console.error("Error en cancelChallenge:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor",
    });
  }
};
