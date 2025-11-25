import User from "../models/user.model.js";

export const limitProfileEdit = async (req, res, next) => {
  try {
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

    const user = await User.findById(req.userId).select("lastEditAt");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const lastEdit = new Date(user.lastEditAt).getTime();
    const now = Date.now();

    if (now - lastEdit < ONE_WEEK) {
      const timeLeft = ONE_WEEK - (now - lastEdit);
      const days = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

      return res.status(403).json({
        success: false,
        message: `Solo puedes editar esta sección cada 7 días. Te faltan ${days} día(s).`,
      });
    }

    next();
  } catch (error) {
    console.error("limitProfileEdit:", error);
    return res.status(500).json({
      success: false,
      message: "Error del servidor",
    });
  }
};