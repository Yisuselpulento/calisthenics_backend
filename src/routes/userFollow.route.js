import express from "express";
import {
  getFollowers,
  getFollowing,
  toggleFollow,
} from "../controllers/userFollow.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

/* ---------------------- RUTAS PUBLICAS ---------------------- */

// Obtener seguidores de un usuario
router.get("/:userId/followers", getFollowers);

// Obtener usuarios que sigue un usuario
router.get("/:userId/following", getFollowing);

/* ---------------------- RUTAS PROTEGIDAS ---------------------- */

// Toggle follow/unfollow (usuario logueado)
router.post("/:userId/toggle-follow", verifyAuth, toggleFollow);

export default router;