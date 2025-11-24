import { Router } from "express";
import {
  createSkill,
  getAllSkills,
  getSkillByKey,
  updateSkill,
  deleteSkill
} from "../controllers/skillsAdmin.controller.js";

import {
  addVariant,
  updateVariant,
  deleteVariant,
  getAllVariants,
  getVariantByKey
} from "../controllers/variantAdmin.controller.js";
import { isAdminMiddleware } from "../Auth/middleware/isAdminMiddleware.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";

const router = Router();

/* ----------------------- SKILLS ----------------------- */
router.post("/",verifyAuth, isAdminMiddleware ,  createSkill);
router.get("/",verifyAuth, getAllSkills);
router.get("/:skillKey",verifyAuth, getSkillByKey);
router.put("/:skillKey",verifyAuth,isAdminMiddleware, updateSkill);
router.delete("/:skillKey",verifyAuth, isAdminMiddleware, deleteSkill);

/* ---------------------- VARIANTS ----------------------- */
router.post("/:skillKey/variants", verifyAuth,isAdminMiddleware, addVariant);
router.put("/:skillKey/variants/:variantKey",verifyAuth,isAdminMiddleware, updateVariant);
router.delete("/:skillKey/variants/:variantKey",verifyAuth, isAdminMiddleware, deleteVariant);
router.get("/:skillKey/variants", verifyAuth,getAllVariants);
router.get("/:skillKey/variants/:variantKey",verifyAuth, getVariantByKey);

export default router;
