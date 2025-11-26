import express from "express";
import { searchUsers } from "../controllers/user.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

// Endpoint de búsqueda de usuarios
router.get("/search", verifyAuth, searchUsers);

export default router;