import express from "express";
import { getMatchByIdController } from "../controllers/match.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

router.get("/:matchId", verifyAuth, getMatchByIdController);

export default router;
