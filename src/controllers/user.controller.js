import User from "../models/user.model.js";

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.userId;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos.",
      });
    }

    const regex = new RegExp(query.trim(), "i");

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ fullName: regex }, { username: regex }],
    })
      .sort({ username: 1 })   // 🔒 orden estable (opcional pero recomendado)
      .limit(7)                // ✅ máximo 7 usuarios
      .select("fullName username avatar")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Usuarios encontrados",
      data: users,
    });
  } catch (error) {
    console.error("Error searching user:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

export const getRankedLeaderboard = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const type = req.query.type || "static";

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 10);
    const skip = (page - 1) * limit;

    if (!["static", "dynamic"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de ranking inválido",
      });
    }

    /* ---------------------- LEADERBOARD PAGINADO ---------------------- */

   const leaderboard = await User.find({
  [`ranking.${type}.elo`]: { $ne: null },
})
  .sort({
    [`ranking.${type}.elo`]: -1,
    _id: 1, // 🔒 orden estable
  })
  .skip(skip)
  .limit(limit)
  .select(
    `username fullName avatar ranking.${type}.elo ranking.${type}.tier ranking.${type}.wins ranking.${type}.losses`
  )
  .lean();

    /* ---------------------- TOTAL USERS (para UI) ---------------------- */

    const totalUsers = await User.countDocuments({
  [`ranking.${type}.elo`]: { $ne: null },
});

    /* ---------------------- USUARIO ACTUAL ---------------------- */

    const me = await User.findById(currentUserId)
      .select(
        `username fullName avatar ranking.${type}.elo ranking.${type}.tier ranking.${type}.wins ranking.${type}.losses`
      )
      .lean();

    let myRank = null;

    if (me?.ranking?.[type]?.elo != null) {
      myRank =
        (await User.countDocuments({
          [`ranking.${type}.elo`]: { $gt: me.ranking[type].elo },
        })) + 1;
    }

    /* ---------------------- AGREGAR RANK GLOBAL ---------------------- */

    const leaderboardWithRank = leaderboard.map((user, index) => ({
      ...user,
      rank: skip + index + 1,
    }));

    return res.status(200).json({
      success: true,
      message: `Leaderboard ranked (${type})`,
      data: {
        leaderboard: leaderboardWithRank,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
        },
        me: me
          ? {
              ...me,
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
