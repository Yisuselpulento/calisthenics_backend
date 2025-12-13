import jwt from "jsonwebtoken";

export const verifyAuth = (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // 🔥 Fallback para iOS / Safari
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No autenticado. Token no proporcionado." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin || false;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Token inválido o expirado" });
    }

    console.error("Error in verifyAuth:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error del servidor" });
  }
};
