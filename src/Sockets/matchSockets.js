import crypto from "crypto";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const initMatchSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("⚡ Socket conectado:", socket.id);

     socket.on("register", (userId) => {
      socket.userId = userId;
      socket.join(userId); // 👈 MUY IMPORTANTE
      console.log("👤 Usuario registrado en socket:", userId);
    });

    /* ----------- ENVIAR DESAFÍO ----------- */
    socket.on(
  "challengeRequest",
  async ({ fromUserId, toUserId, type }, callback) => {
    try {
      const challengeId = crypto.randomUUID();

      const notification = await Notification.create({
        user: toUserId,
        fromUser: fromUserId,
        type: "system",
        message: "Te ha enviado un desafío",
        metadata: {
          type,              // static | dynamic
          matchType: "casual"
        },
        challengeId,
        actions: ["accept", "reject"],
      });

      const fullNotification = await Notification.findById(notification._id)
        .populate("fromUser", "username avatar");

      await User.findByIdAndUpdate(toUserId, {
        $inc: { notificationsCount: 1 },
      });

      io.to(toUserId).emit("newNotification", fullNotification);

      // ✅ ACK
      callback({ success: true, challengeId });
    } catch (err) {
      callback({ success: false });
    }
  }
);


     socket.on("challengeResponse", async ({ challengeId, accepted }) => {
      try {
        // Buscar la notificación relacionada con el desafío
        const notification = await Notification.findOne({ challengeId });
        if (!notification) return;

        // Solo el receptor puede responder
        if (socket.userId !== notification.user.toString()) return;

        // Marcar la notificación como leída
        notification.read = true;
        await notification.save();

         if (accepted) {
            io.to(notification.fromUser.toString()).emit("challengeAccepted", {
            challengeId,
            opponentId: notification.user.toString(), // quien aceptó
          });

          io.to(notification.user.toString()).emit("challengeAccepted", {
            challengeId,
            opponentId: notification.fromUser.toString(), // quien envió
          });
            } else {
              // Emitir rechazo
              io.to(notification.fromUser.toString()).emit("challengeRejected", { challengeId, message: "Desafío rechazado" });
            }

             await Notification.findByIdAndDelete(notification._id);

        // ⚡ Reducir contador de notificaciones si quieres mantenerlo consistente
        await User.findByIdAndUpdate(notification.user, {
          $inc: { notificationsCount: -1 },
        });

      } catch (err) {
        console.error("Error al manejar challengeResponse:", err);
      }
    });


    socket.on("disconnect", () => {
      console.log("🔴 Socket desconectado:", socket.id);
    });
  });
};
