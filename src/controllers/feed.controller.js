import FeedEvent from "../models/feedEvent.model.js";
import User from "../models/user.model.js";

/* -------------------- GET FEED EVENTS -------------------- */
export const getFeedEvents = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    // obtener usuarios que sigo
    const user = await User.findById(userId).select("following");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const followingIds = user.following.map(id => id.toString());

    const events = await FeedEvent.find({
      user: { $in: [...followingIds, userId] }
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("user", "fullName username avatar");

    return res.status(200).json({
      success: true,
      message: "Feed filtrado por usuarios seguidos",
      data: events,
    });

  } catch (error) {
    console.error("Error en getFeedEvents:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};
