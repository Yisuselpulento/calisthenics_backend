import express from "express";
import { login, signup, logout,verifyEmail,forgotPassword,resetPassword,checkAuth, resendVerificationToken, profileAdmin } from "../controllers/authController.js";
import { isAdminMiddleware } from "../middleware/isAdminMiddleware.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/verify-email", verifyEmail)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)

router.get("/check-auth", verifyAuth, checkAuth)
router.post("/resend-verification-token", verifyAuth, resendVerificationToken);

router.get("/admin", verifyAuth, isAdminMiddleware,  profileAdmin);


export default router 