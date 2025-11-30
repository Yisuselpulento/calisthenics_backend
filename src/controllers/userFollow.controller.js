import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import mongoose from "mongoose";
import { UpdateFullUser } from "../utils/updateFullUser.js";

/* ---------------------- OBTENER FOLLOWERS ---------------------- */
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("followers", "username fullName avatar");
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado." });

    res.status(200).json({ success: true, followers: user.followers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al obtener followers." });
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
    console.error(error);
    res.status(500).json({ success: false, message: "Error al obtener following." });
  }
};

/* ---------------------- TOGGLE FOLLOW ---------------------- */
export const toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params; 
    const currentUserId = req.userId; 

    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: "No puedes seguirte a ti mismo." });
    }

    const userToFollow = await User.findById(userId);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
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

      // ---------------------- CREAR NOTIFICACIÓN ----------------------
      const message = `${currentUser.username} ha comenzado a seguirte.`;
      const notification = await Notification.create({
        user: userToFollow._id,
        fromUser: currentUser._id,
        type: "follow",
        message,
      });

      // Agregar la notificación al usuario
      userToFollow.notifications.push(notification._id);
      userToFollow.notificationsCount += 1;
    }

    await currentUser.save();
    await userToFollow.save();

    const updatedUser = await UpdateFullUser(currentUserId);

    res.json({
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error al seguir/dejar de seguir al usuario." });
  }
};
