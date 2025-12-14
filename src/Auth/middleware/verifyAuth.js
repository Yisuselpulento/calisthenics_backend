import jwt from "jsonwebtoken";
import User from "../../models/user.model.js"

export const verifyAuth = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No autenticado. Token no proporcionado."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .select("_id username isAdmin");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // 🔥 AQUÍ está la clave
    req.userId = user._id;
    req.user = user;               
    req.isAdmin = user.isAdmin;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado"
    });
  }
};
