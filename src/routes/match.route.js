import express from "express";
import { getMatchByIdController ,getMyRankedHistory,getMyCasualHistory } from "../controllers/match.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

router.get("/:matchId", verifyAuth, getMatchByIdController);
router.get("/me/history/ranked", verifyAuth, getMyRankedHistory);
router.get("/me/history/casual", verifyAuth, getMyCasualHistory);

export default router;
