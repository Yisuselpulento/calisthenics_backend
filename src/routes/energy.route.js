// routes/energy.routes.js
import express from "express";
import {
  buyEnergyBoost,
  buyFullEnergy,
  getEnergy, // 🔹 agregar controlador de consulta de energía
} from "../controllers/energy.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = express.Router();

// 🔹 Consultar energía actual
router.get("/", verifyAuth, getEnergy);

// 🔹 Comprar boost temporal (x2 regeneración por 3 días)
router.post("/boost", verifyAuth, buyEnergyBoost);

// 🔹 Recarga completa de energía
router.post("/full", verifyAuth, buyFullEnergy);

export default router;
