import { initRankedSockets } from "./ranked.socket.js";

export const initMatchSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("⚡ Socket conectado:", socket.id);

    socket.on("register", (userId) => {
      socket.userId = userId;
      socket.join(userId);
      console.log("👤 Usuario registrado en socket:", userId);
    });

    initRankedSockets(io, socket);

    socket.on("disconnect", () => {
      console.log("🔴 Socket desconectado:", socket.id);
    });
  });
};

