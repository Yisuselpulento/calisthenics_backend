import express from "express";
import { doMatch } from "../controllers/match.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

router.post("/", verifyAuth, doMatch);

export default router;
