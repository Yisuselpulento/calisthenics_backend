import { doMatch } from "../controllers/match.controller.js";
import User from "../models/user.model.js";

export const initMatchSockets = (io) => {
  // Guardar usuarios conectados
  const onlineUsers = new Map(); // userId -> socket.id

  io.on("connection", (socket) => {
    console.log("⚡ Usuario conectado:", socket.id);

    // Registrar usuario al conectar
    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log("Usuario registrado:", userId);
    });

    // Solicitud de desafío
    socket.on("challengeRequest", async ({ fromUserId, toUserId, type }) => {
      const opponentSocketId = onlineUsers.get(toUserId);
      if (!opponentSocketId) {
        return io.to(socket.id).emit("challengeRejected", { message: "El oponente no está en línea." });
      }

      // Avisar al oponente
      io.to(opponentSocketId).emit("incomingChallenge", { fromUserId, type });

      // Esperar respuesta del oponente
      socket.once("challengeResponse", async ({ accepted }) => {
        if (!accepted) {
          return io.to(socket.id).emit("challengeRejected", { message: "El oponente rechazó el desafío." });
        }

        // Ejecutar lógica del match como si fuera HTTP
        try {
          const fakeReq = {
            userId: fromUserId,
            body: { opponentId: toUserId, type, matchType: "casual" },
          };

          const fakeRes = {
            status: (code) => ({
              json: (data) => {
                if (data.success) {
                  io.to(socket.id).emit("challengeAccepted", data);
                  io.to(opponentSocketId).emit("challengeAccepted", data);
                } else {
                  io.to(socket.id).emit("challengeRejected", { message: data.message });
                }
              },
            }),
          };

          await doMatch(fakeReq, fakeRes);
        } catch (err) {
          io.to(socket.id).emit("challengeRejected", { message: "Error al iniciar el match." });
        }
      });
    });

    // Limpiar usuarios al desconectarse
    socket.on("disconnect", () => {
      for (let [userId, id] of onlineUsers) {
        if (id === socket.id) onlineUsers.delete(userId);
      }
      console.log("Usuario desconectado:", socket.id);
    });
  });

  return io;
};
