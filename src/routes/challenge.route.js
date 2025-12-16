import express from "express";
import {
  createChallenge,
  respondChallenge,
  cancelChallenge,
} from "../controllers/challenge.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js"

const router = express.Router();

router.post("/create", verifyAuth, createChallenge);
router.post("/respond", verifyAuth, respondChallenge);
router.delete("/:challengeId", verifyAuth, cancelChallenge);

export default router;
