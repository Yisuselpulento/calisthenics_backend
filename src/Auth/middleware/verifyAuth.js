import jwt from "jsonwebtoken";

export const verifyAuth = (req, res, next) => {

	const token = req.cookies.token;
	if (!token) return res.status(401).json({ success: false, message:  "No autenticado. Token no proporcionado." });
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		if (!decoded) return res.status(401).json({ success: false, message: "No autenticado. Token inválido." });

		req.userId = decoded.userId;
		req.isAdmin = decoded.isAdmin || false;

		next();
	} catch (error) {
		if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
			return res.status(401).json({ success: false, message: "Token inválido o expirado" });
		}
		console.log("Error in verifyToken ", error);
		return res.status(500).json({ success: false, message: "Error del servidor" });
	}
};