import express from "express";
import { getMatchByIdController ,getUserRankedHistory,getUserCasualHistory } from "../controllers/match.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

router.get("/:matchId", verifyAuth, getMatchByIdController);
router.get("/user/:userId/ranked", verifyAuth, getUserRankedHistory);
router.get("/user/:userId/casual", verifyAuth, getUserCasualHistory);

export default router;
