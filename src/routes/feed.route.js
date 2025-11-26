import express from "express";
import { getFeedEvents } from "../controllers/feed.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

// GET /api/feed
router.get("/", verifyAuth, getFeedEvents);

export default router;
