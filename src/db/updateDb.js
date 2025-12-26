import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model.js";

// ----------------- Config -----------------
const MONGO_URI = process.env.MONGO_URI || "";

// ----------------- Función de migración de rankings -----------------

const migrateUserRankings = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado a la DB");

    const users = await User.find({});
    console.log(`Encontrados ${users.length} usuarios`);

    let updatedCount = 0;

    for (const user of users) {
      console.log("--------------------------------------------");
      console.log("Usuario:", user._id);
      console.log("Ranking actual:", JSON.stringify(user.ranking, null, 2));

      const oldRanking = user.ranking || {};

      // Copiamos valores antiguos si existen, o usamos defaults
      const staticElo = oldRanking.static?.elo || oldRanking.elo || oldRanking.points || 1000;
      const staticTier = oldRanking.static?.tier || oldRanking.tier || "Bronze";
      const staticWins = oldRanking.static?.wins || oldRanking.wins || 0;
      const staticLosses = oldRanking.static?.losses || oldRanking.losses || 0;

      const dynamicElo = oldRanking.dynamic?.elo || 1000;
      const dynamicTier = oldRanking.dynamic?.tier || "Bronze";
      const dynamicWins = oldRanking.dynamic?.wins || 0;
      const dynamicLosses = oldRanking.dynamic?.losses || 0;

      // Reescribimos el ranking en el nuevo formato
      user.ranking = {
        static: {
          elo: staticElo,
          tier: staticTier,
          wins: staticWins,
          losses: staticLosses,
        },
        dynamic: {
          elo: dynamicElo,
          tier: dynamicTier,
          wins: dynamicWins,
          losses: dynamicLosses,
        },
      };

      await user.save();
      updatedCount++;
      console.log(`➡️ Migrado y limpio user: ${user._id}`);
    }

    console.log("============================================");
    console.log(`Migración completada. Usuarios actualizados: ${updatedCount}`);
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
};

migrateUserRankings();