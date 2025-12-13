import jwt from "jsonwebtoken";

export const isAdminMiddleware = (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // 🔥 Fallback para iOS
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No autenticado. Token no proporcionado." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Acceso denegado: solo administradores." });
    }

    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;

    next();
  } catch (error) {
    console.error("Error en isAdminMiddleware:", error);
    return res
      .status(401)
      .json({ success: false, message: "Token inválido o expirado." });
  }
};
