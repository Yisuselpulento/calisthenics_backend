import jwt from "jsonwebtoken";
import User from "../../models/user.model.js";

export const verifyAuth = async (req, res, next) => {
  try {
    // 1️⃣ Intentar desde COOKIE (web)
    let token = req.cookies?.token;

    // 2️⃣ Si no hay cookie, intentar HEADER (mobile)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No autenticado. Token no proporcionado.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .select("_id username isAdmin");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    // 👉 datos disponibles en TODA la app
    req.userId = user._id;
    req.user = user;
    req.isAdmin = user.isAdmin;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }
};
