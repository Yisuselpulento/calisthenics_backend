import User from "../models/user.model.js";

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query; // recibimos el parámetro de búsqueda
    const currentUserId = req.userId; // viene del middleware verifyAuth

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos.",
      });
    }

    const regex = new RegExp(query, "i"); // búsqueda insensible a mayúsculas/minúsculas

    const users = await User.find({
      _id: { $ne: currentUserId }, // excluye al usuario actual
      $or: [{ fullName: regex }, { username: regex }],
    }).select("fullName username avatar");

    return res.status(200).json({
      success: true,
      message: "Usuarios encontrados",
      data: users,
    });
  } catch (error) {
    console.error("Error searching user:", error);
     return res.status(500).json({ success: false, message: "Error interno del servidor",});
  }
};

export const getRankedLeaderboard = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const type = req.query.type || "static"; // Por defecto "static"

    if (!["static", "dynamic"].includes(type)) {
      return res.status(400).json({ success: false, message: "Tipo de ranking inválido" });
    }

    // 🔥 Top 100
    const leaderboard = await User.find({})
      .sort({ [`ranking.${type}.elo`]: -1 })
      .select(
        `username fullName avatar ranking.${type}.elo ranking.${type}.tier ranking.${type}.wins ranking.${type}.losses`
      )
      .limit(100);

    // 🔢 Usuario actual
    const me = await User.findById(currentUserId).select(
      `username fullName avatar ranking.${type}.elo ranking.${type}.tier ranking.${type}.wins ranking.${type}.losses`
    );

    const myRank =
      me
        ? (await User.countDocuments({
            [`ranking.${type}.elo`]: { $gt: me.ranking[type].elo },
          })) + 1
        : null;

    return res.status(200).json({
      success: true,
      message: `Leaderboard ranked (${type})`,
      data: {
        leaderboard,
        me: me
          ? {
              ...me.toObject(),
              rank: myRank,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error getRankedLeaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};
