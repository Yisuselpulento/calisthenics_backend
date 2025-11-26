import FeedEvent from "../models/feedEvent.model.js";

/* -------------------- GET FEED EVENTS -------------------- */
export const getFeedEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query; // paginación opcional

    const events = await FeedEvent.find()
      .sort({ createdAt: -1 }) // los más recientes primero
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("user", "name username avatar"); // traer info básica del usuario

    return res.status(200).json({
      success: true,
      message: "Feed events obtenidos correctamente",
      data: events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
