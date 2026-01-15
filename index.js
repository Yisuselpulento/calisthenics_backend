import "dotenv/config";

import http from "http";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./src/db/connectDB.js";

import authRoutes from "./src/Auth/routes/auth.route.js";
import skillAdminRoutes from "./src/routes/skillAdmin.route.js";
import updateProfile from "./src/routes/profile.route.js";
import userSkillRoutes from "./src/routes/userSkills.route.js";
import comboRoutes from "./src/routes/combo.route.js";
import userFollowRoutes from "./src/routes/userFollow.route.js";
import reportRoutes from "./src/routes/report.route.js";
import notificationRoutes from "./src/routes/notification.route.js";
import userRoutes from "./src/routes/user.route.js";
import feedRoutes from "./src/routes/feed.route.js";
import matchRoutes from "./src/routes/match.route.js";
import challengeRoutes from "./src/routes/challenge.route.js";
import energyRoutes from "./src/routes/energy.route.js";

import { setIO } from "./src/Sockets/io.js";
import { initMatchSockets } from "./src/Sockets/matchSockets.js";

import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------- Middleware --------------------
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

/*  app.use(cors()); */ 
app.use(express.json());
app.use(cookieParser());

// -------------------- Rutas --------------------
app.use("/api/auth", authRoutes);
app.use("/api/profile", updateProfile);
app.use("/api/skills", skillAdminRoutes);
app.use("/api/user-skills", userSkillRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/user-follow", userFollowRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/challenge", challengeRoutes);
app.use("/api/energy",energyRoutes);

app.get("/api/check-cookie", (req, res) => {
  const tokenCookie = req.cookies.token;
  res.json({
    token: tokenCookie ? "exists" : "no cookie",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax"
  });
});

// -------------------- Servidor HTTP --------------------
const server = http.createServer(app);

// -------------------- Socket.IO --------------------
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Guardamos la instancia de io globalmente
setIO(io);

// Inicializamos listeners y eventos
initMatchSockets(io);

// -------------------- Conexión MongoDB y Levantar Servidor --------------------
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar con MongoDB:", err);
    process.exit(1);
  });
