import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const users = mongoose.connection.db.collection("users");

    // Defaults a aplicar a todos los usuarios que no tengan esos campos
    const defaults = {
      avatar: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Windows_10_Default_Profile_Picture.svg",
      country: "",
      videoProfile: "",
      altura: 0,
      peso: 0
    };

    // Recorremos cada key y aplicamos un updateMany
    for (const [field, value] of Object.entries(defaults)) {
      const result = await users.updateMany(
        { [field]: { $exists: false } },
        { $set: { [field]: value } }
      );
      console.log(`Updated ${result.modifiedCount} users missing "${field}"`);
    }

    console.log("All missing default fields added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating users:", error);
    process.exit(1);
  }
};

run();