import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js";

// ----------------- Config -----------------
const MONGO_URI =  "";

// ----------------- Función de migración de rankings -----------------

const migrateRankingDraws = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado a la DB");

    const result = await User.updateMany(
      {
        $or: [
          { "ranking.static.draws": { $exists: false } },
          { "ranking.dynamic.draws": { $exists: false } },
        ],
      },
      {
        $set: {
          "ranking.static.draws": 0,
          "ranking.dynamic.draws": 0,
        },
      }
    );

    console.log("============================================");
    console.log(`✅ Usuarios modificados: ${result.modifiedCount}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error en migración:", err);
    await mongoose.disconnect();
  }
};

migrateRankingDraws();