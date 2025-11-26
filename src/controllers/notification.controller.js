import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import Team from "../models/team.model.js";
import Skill from "../models/skill.model.js";
import Combo from "../models/combo.model.js";

/* ---------------------- OBTENER NOTIFICACIONES DEL USUARIO ---------------------- */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("fromUser", "username fullName avatar")
      .populate("relatedSkill", "name")
      .populate("relatedCombo", "name type")
      .populate("relatedTeam", "name");

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("getUserNotifications:", error);
    res.status(500).json({ success: false, message: "Error al obtener notificaciones." });
  }
};

/* ---------------------- MARCAR UNA NOTIFICACIÓN COMO LEÍDA ---------------------- */
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) return res.status(404).json({ success: false, message: "Notificación no encontrada." });

    notification.read = true;
    await notification.save();

    // Actualizar el contador de notificaciones no leídas
    await User.findByIdAndUpdate(userId, { $inc: { notificationsCount: -1 } });

    res.status(200).json({ success: true, message: "Notificación marcada como leída." });
  } catch (error) {
    console.error("markNotificationAsRead:", error);
    res.status(500).json({ success: false, message: "Error al marcar notificación como leída." });
  }
};

/* ---------------------- MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS ---------------------- */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.updateMany({ user: userId, read: false }, { read: true });

    // Resetear contador de notificaciones no leídas
    await User.findByIdAndUpdate(userId, { notificationsCount: 0 });

    res.status(200).json({ success: true, message: "Todas las notificaciones marcadas como leídas." });
  } catch (error) {
    console.error("markAllNotificationsAsRead:", error);
    res.status(500).json({ success: false, message: "Error al marcar todas las notificaciones como leídas." });
  }
};