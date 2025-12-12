import mongoose from "mongoose";
import UserSkill from "../models/userSkill.model.js"; // ajusta la ruta

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const userSkills = await UserSkill.find(); // traemos todos los UserSkills

    for (const us of userSkills) {
      let modified = false;

      us.variants.forEach(v => {
        if (!v.usedInCombos) {
          v.usedInCombos = [];
          modified = true;
        }
      });

      if (modified) {
        await us.save();
        console.log("Actualizado UserSkill:", us._id);
      }
    }

    console.log("Proceso completado!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating UserSkills:", error);
    process.exit(1);
  }
};

run();
