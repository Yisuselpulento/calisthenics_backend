import express from "express";
import {
  createReport,
  getAllReports,
  getReportById,
  updateReportStatus,
} from "../controllers/report.controller.js";

import { verifyAuth } from "../Auth/middleware/verifyAuth.js";
import { isAdminMiddleware } from "../Auth/middleware/isAdminMiddleware.js";

const router = express.Router();

/* ---------------------- RUTAS DE REPORTES ---------------------- */

/* Crear un reporte (cualquier usuario autenticado) */
router.post("/", verifyAuth, createReport);

/* Obtener todos los reportes (solo admin) */
router.get("/", verifyAuth, isAdminMiddleware, getAllReports);

/* Obtener un reporte por ID (admin o quien lo creó) */
router.get("/:reportId", verifyAuth, getReportById);

/* Actualizar estado y nota del moderador (solo admin) */
router.put("/:reportId", verifyAuth, isAdminMiddleware, updateReportStatus);

export default router;
