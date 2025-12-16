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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getRankedLeaderboard = async (req, res) => {
  try {
    const currentUserId = req.userId;

    // 🔥 Top 100
    const leaderboard = await User.find({})
      .sort({ "ranking.elo": -1 })
      .select(
        "username fullName avatar ranking.elo ranking.tier ranking.wins ranking.losses"
      )
      .limit(100);

    // 🔢 Usuario actual
    const me = await User.findById(currentUserId).select(
      "username fullName avatar ranking.elo ranking.tier ranking.wins ranking.losses"
    );
    
    const myRank =
      me
        ? (await User.countDocuments({
            "ranking.elo": { $gt: me.ranking.elo },
          })) + 1
        : null;

    return res.status(200).json({
      success: true,
      message: "Leaderboard ranked",
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
      message: "Server error",
    });
  }
};
