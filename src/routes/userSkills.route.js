import express from "express";
import { upload } from "../middleware/upload.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";
import {
  addSkillVariant,
  editSkillVariant,
  deleteSkillVariant,
  getUserSkills, 
  toggleFavoriteSkill,
  getFavoriteSkills,
  getUserSkillVariantById
} from "../controllers/userSkills.controller.js";
import { multerErrorHandler } from "../middleware/multerErrorHandler.js";

const router = express.Router();

router.post(
  "/add",
  verifyAuth,
  upload.single("video"), 
  multerErrorHandler,
  addSkillVariant
);

router.put(
  "/edit/:userSkillVariantId",
  verifyAuth,
  upload.single("video"),
  multerErrorHandler,
  editSkillVariant
);

router.delete("/delete/:userSkillVariantId", verifyAuth, deleteSkillVariant);

router.get("/", verifyAuth, getUserSkills);

router.post("/favorites/:userSkillVariantId", verifyAuth, toggleFavoriteSkill);
router.get("/favorites", verifyAuth, getFavoriteSkills);
router.get("/skill/variant/:userSkillVariantId", verifyAuth, getUserSkillVariantById);

export default router;
