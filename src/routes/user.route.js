import express from "express";
import { searchUsers, getRankedLeaderboard, savePushToken } from "../controllers/user.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

// Endpoint de búsqueda de usuarios
router.get("/search", verifyAuth, searchUsers);
router.get("/ranked-leaderboard", verifyAuth, getRankedLeaderboard);
router.post("/push-token", verifyAuth, savePushToken);

export default router;