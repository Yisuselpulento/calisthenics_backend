import "dotenv/config";
import mongoose from "mongoose";
import UserSkill from "../models/userSkill.model.js";
import User from "../models/user.model.js"; 
import Combo from "../models/combo.model.js";

// ----------------- Config -----------------
const MONGO_URI = ""

// ----------------- Función para extraer publicId -----------------
const migrateUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado a la DB");

    const users = await User.find({});
    console.log(`Encontrados ${users.length} usuarios`);

    let updatedCount = 0;

    for (const user of users) {
      let updated = false;

      // Migrar avatar
      if (!user.avatar || !user.avatar.url) {
        user.avatar = {
          url: user.avatar?.url || "https://upload.wikimedia.org/wikipedia/commons/b/b5/Windows_10_Default_Profile_Picture.svg",
          publicId: user.avatar?.publicId || null,
        };
        updated = true;
      }

      // Migrar videoProfile
      if (!user.videoProfile || !user.videoProfile.url) {
        user.videoProfile = {
          url: user.videoProfile?.url || "", // si no tienes video, lo dejamos vacío
          publicId: user.videoProfile?.publicId || null,
        };
        updated = true;
      }

      if (updated) {
        await user.save();
        updatedCount++;
        console.log(`Actualizado User: ${user._id}`);
      }
    }

    console.log(`Migración completada. Usuarios actualizados: ${updatedCount}`);
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
};

migrateUsers();