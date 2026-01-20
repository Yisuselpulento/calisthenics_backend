import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import mongoose from "mongoose";
import { UpdateFullUser } from "../utils/updateFullUser.js";
import { sendPushNotification } from "../utils/pushHelper.js";

/* ---------------------- OBTENER FOLLOWERS ---------------------- */
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("followers", "username fullName avatar");
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado." });

    res.status(200).json({ success: true, followers: user.followers });
  } catch (error) {
   console.error("Error get follower:", error);
     return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};

/* ---------------------- OBTENER FOLLOWING ---------------------- */
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("following", "username fullName avatar");
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado." });

    res.status(200).json({ success: true, following: user.following });
  } catch (error) {
    console.error("Error get following:", error);
     return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};


export const toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    if (userId === currentUserId) {
      return res
        .status(400)
        .json({ success: false, message: "No puedes seguirte a ti mismo." });
    }

    const userToFollow = await User.findById(userId);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "Usuario no encontrado." });
    }

    const isFollowing = currentUser.following.includes(userToFollow._id);

    if (isFollowing) {
      // Dejar de seguir
      currentUser.following.pull(userToFollow._id);
      userToFollow.followers.pull(currentUser._id);
    } else {
      // Seguir
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);

      // ---------------------- CREAR NOTIFICACIÓN EN DB ----------------------
      const messageText = `${currentUser.username} ha comenzado a seguirte.`;
      const notification = await Notification.create({
        user: userToFollow._id,
        fromUser: currentUser._id,
        type: "follow",
        message: messageText,
      });

      userToFollow.notifications.push(notification._id);
      userToFollow.notificationsCount += 1;

      // ---------------------- ENVIAR PUSH ----------------------
      if (userToFollow.pushTokens?.length) {
        // Puede tener varios tokens si tiene varios dispositivos
        for (const token of userToFollow.pushTokens) {
          sendPushNotification(token, "Nuevo seguidor 💪", messageText, {
            type: "follow",
            fromUser: currentUser._id.toString(),
          });
        }
      }
    }

    await currentUser.save();
    await userToFollow.save();

    const updatedUser = await UpdateFullUser(currentUserId);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error toggle follow:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};
