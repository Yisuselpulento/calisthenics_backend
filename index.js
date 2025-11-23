import express from "express"
import dotenv from "dotenv" 
import cookieParser from "cookie-parser";
import cors from "cors"
import { connectDB } from "./src/db/connectDB.js";
import authRoutes from "./src/Auth/routes/auth.route.js" 

dotenv.config() 

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRoutes)

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