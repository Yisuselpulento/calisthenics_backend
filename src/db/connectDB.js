import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    // No matamos el proceso
    // Opcional: intentar reconectar cada X segundos
    setTimeout(connectDB, 5000); // reintenta cada 5s
  }
};