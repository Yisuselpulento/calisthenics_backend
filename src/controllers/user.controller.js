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
