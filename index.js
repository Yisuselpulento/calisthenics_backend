import "dotenv/config";

import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors"
import { connectDB } from "./src/db/connectDB.js";
import authRoutes from "./src/Auth/routes/auth.route.js" 
import skillAdminRoutes from "./src/routes/skillAdmin.route.js"
import updateProfile from "./src/routes/profile.route.js"
import userSkillRoutes from "./src/routes/userSkills.route.js";
import comboRoutes from "./src/routes/combo.route.js";
import userFollowRoutes from "./src/routes/userFollow.route.js";
import reportRoutes from "./src/routes/report.route.js";
import notificationRoutes from "./src/routes/notification.route.js";

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRoutes)
app.use("/api/profile/update", updateProfile);
app.use("/api/skills", skillAdminRoutes);
app.use("/api/user-skills", userSkillRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/user-follow", userFollowRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar con MongoDB:", err);
    process.exit(1);
  });

  // Capturar errores que no se lanzan dentro de promesas
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💀 Uncaught Exception:", err);
});