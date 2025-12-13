import jwt from "jsonwebtoken";

export const isAdminMiddleware = (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ success: false, message: "No autenticado. Token no proporcionado." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, message: "Acceso denegado: solo administradores." });
        }

        next();
    } catch (error) {
        console.error("Error en isAdminMiddleware:", error);
        return res.status(401).json({ success: false, message: "Token inválido o expirado." });
    }
};