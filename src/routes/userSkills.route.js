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

router.post("/favorites/:userSkillId/:variantKey/:fingers", verifyAuth, toggleFavoriteSkill);
router.get("/favorites", verifyAuth, getFavoriteSkills);
router.get("/skill/:userSkillId/:variantKey/:fingers", verifyAuth, getUserSkillVariantById);

export default router;
