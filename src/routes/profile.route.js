import express from "express";
import { upload } from "../middleware/upload.js";
import {
  updateProfile,
  updateAdvancedProfile,
  getProfileByUsername
} from "../controllers/profile.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";
import { limitProfileEdit } from "../middleware/limitProfileEdit.js";
import { multerErrorHandler } from "../middleware/multerErrorHandler.js";

const router = express.Router();

router.put(
  "/update",
  verifyAuth,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "videoProfile", maxCount: 1 },
  ]),
  multerErrorHandler,
  updateProfile
);


router.put("/update/advanced", verifyAuth, limitProfileEdit, updateAdvancedProfile);

router.get("/:username", verifyAuth, getProfileByUsername);

export default router;