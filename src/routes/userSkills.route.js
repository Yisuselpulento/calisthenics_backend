import express from "express";
import { upload } from "../middleware/upload.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";
import {
  addSkillVariant,
  editSkillVariant,
  deleteSkillVariant,
  getUserSkills, 
  toggleFavoriteSkill,
  getFavoriteSkills
} from "../controllers/userSkills.controller.js";

const router = express.Router();

router.post(
  "/add",
  verifyAuth,
  upload.single("video"), 
  addSkillVariant
);

router.put(
  "/edit/:userSkillId/:variantKey/:fingers",
  verifyAuth,
  upload.single("video"),
  editSkillVariant
);

router.delete("/delete/:userSkillId/:variantKey/:fingers", verifyAuth, deleteSkillVariant);

router.get("/", verifyAuth, getUserSkills);

router.post("/favorites/:userSkillId/:variantKey", verifyAuth, toggleFavoriteSkill);
router.get("/favorites", verifyAuth, getFavoriteSkills);

export default router;
