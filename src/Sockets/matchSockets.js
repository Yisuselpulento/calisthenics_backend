import { doMatch } from "../controllers/match.controller.js";

export const initMatchSockets = (io) => {
  const onlineUsers = new Map();       // userId -> socket.id
  const pendingChallenges = new Map(); // challengeId -> data

  io.on("connection", (socket) => {
    console.log("⚡ Usuario conectado:", socket.id);

    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log("🟢 Usuario registrado:", userId);
    });

    // 1️⃣ Enviar desafío
    socket.on("challengeRequest", ({ fromUserId, toUserId, type }) => {
      const opponentSocketId = onlineUsers.get(toUserId);

      if (!opponentSocketId) {
        return socket.emit("challengeRejected", {
          message: "El oponente no está en línea.",
        });
      }

      const challengeId = crypto.randomUUID();

      pendingChallenges.set(challengeId, {
        fromUserId,
        toUserId,
        type,
        fromSocketId: socket.id,
        toSocketId: opponentSocketId,
      });

      io.to(opponentSocketId).emit("incomingChallenge", {
        challengeId,
        fromUserId,
        type,
      });
    });

    // 2️⃣ Responder desafío (ACEPTAR / RECHAZAR)
    socket.on("challengeResponse", async ({ challengeId, accepted }) => {
      const challenge = pendingChallenges.get(challengeId);

      if (!challenge) return;

      const {
        fromUserId,
        toUserId,
        type,
        fromSocketId,
        toSocketId,
      } = challenge;

      pendingChallenges.delete(challengeId);

      if (!accepted) {
        return io.to(fromSocketId).emit("challengeRejected", {
          message: "El oponente rechazó el desafío.",
        });
      }

      try {
        const fakeReq = {
          userId: fromUserId,
          body: {
            opponentId: toUserId,
            type,
            matchType: "casual",
          },
        };

        const fakeRes = {
          status: () => ({
            json: (data) => {
              if (data.success) {
                io.to(fromSocketId).emit("challengeAccepted", data);
                io.to(toSocketId).emit("challengeAccepted", data);
              } else {
                io.to(fromSocketId).emit("challengeRejected", {
                  message: data.message,
                });
              }
            },
          }),
        };

        await doMatch(fakeReq, fakeRes);
      } catch (err) {
        io.to(fromSocketId).emit("challengeRejected", {
          message: "Error al iniciar el match.",
        });
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
      }

      // Limpiar desafíos pendientes del usuario desconectado
      for (const [id, challenge] of pendingChallenges) {
        if (
          challenge.fromSocketId === socket.id ||
          challenge.toSocketId === socket.id
        ) {
          pendingChallenges.delete(id);
        }
      }

      console.log("🔴 Usuario desconectado:", socket.id);
    });
  });

  return io;
};
