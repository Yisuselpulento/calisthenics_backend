import express from "express";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", verifyAuth, getUserNotifications);
router.put("/:notificationId/read", verifyAuth, markNotificationAsRead);
router.put("/read/all", verifyAuth, markAllNotificationsAsRead);

export default router;