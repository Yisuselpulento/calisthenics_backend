import express from "express";
import { upload } from "../middleware/upload.js";
import {
  updateProfile,
  updateAdvancedProfile,
} from "../controllers/profile.controller.js";
import { verifyAuth } from "../Auth/middleware/verifyAuth.js";
import { limitProfileEdit } from "../middleware/limitProfileEdit.js";

const router = express.Router();

router.put(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "videoProfile", maxCount: 1 },
  ]),
  verifyAuth,
  updateProfile
);

router.put("/advanced", verifyAuth, limitProfileEdit, updateAdvancedProfile);

export default router;