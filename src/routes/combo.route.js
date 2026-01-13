import express from "express";
import {
  createCombo,
  getUserCombos,
  getComboById,
  deleteCombo,
  updateCombo,
  toggleFavoriteCombo,
} from "../controllers/combo.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";
import { upload } from "../middleware/upload.js";
import { multerErrorHandler } from "../middleware/multerErrorHandler.js";

const router = express.Router();

router.post(
  "/",
  verifyAuth,
  upload.single("video"), 
  multerErrorHandler,
  createCombo
);
router.get("/", verifyAuth, getUserCombos);
router.get("/:comboId", verifyAuth, getComboById);
router.delete("/:comboId", verifyAuth, deleteCombo);
router.put(
  "/:comboId",
  verifyAuth,
  upload.single("video"),
  multerErrorHandler, // 👈 FALTA
  updateCombo
);
router.post("/favorite/:comboId", verifyAuth, toggleFavoriteCombo);

export default router;