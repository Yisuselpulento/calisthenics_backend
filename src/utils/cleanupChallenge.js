// utils/cleanupChallenge.js
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const cleanupChallenge = async (challenge) => {
  const challengeId = challenge._id;

  /* ---------------------- 1. BORRAR NOTIFICACIONES ---------------------- */
  const notifications = await Notification.find({ challenge: challengeId });
  const notificationIds = notifications.map(n => n._id);
  // Solo las NO leídas descuentan del badge (las leídas ya restaron al leerse)
  const unreadCount = notifications.filter(n => !n.read).length;

  await Notification.deleteMany({ challenge: challengeId });

  /* ---------------------- 2. LIMPIAR USUARIO RECEPTOR (SOLO toUser) ---------------------- */
  if (notificationIds.length > 0) {
    await User.updateOne(
      { _id: challenge.toUser },
      {
        $pull: { notifications: { $in: notificationIds } },
        ...(unreadCount > 0
          ? { $inc: { notificationsCount: -unreadCount } }
          : {}),
      }
    );
  }

  /* ---------------------- 3. LIMPIAR ESTADO DE CHALLENGE (AMBOS) ---------------------- */
  await User.updateMany(
    { _id: { $in: [challenge.fromUser, challenge.toUser] } },
    {
      hasPendingChallenge: false,
      pendingChallenge: null,
    }
  );
};
