import Report from "../models/report.model.js";

/* ---------------------- CREAR REPORTE ---------------------- */
export const createReport = async (req, res) => {
  try {
    const { targetType, target, variantInfo, reason, description } = req.body;

    if (!targetType || !target || !reason) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
    }

    const report = new Report({
      reporter: req.userId,
      targetType,
      target,
      variantInfo: variantInfo || {}, 
      reason,
      description: description || "",
    });

    await report.save();

    res.status(201).json({ success: true, message: "Reporte creado exitosamente.", report });
  } catch (error) {
    console.error("Error creando reporte:", error);
    res.status(500).json({ success: false, message: "Error al crear reporte." });
  }
};


/* ---------------------- OBTENER TODOS LOS REPORTES ---------------------- */
export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporter", "username fullName avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error obteniendo reportes:", error);
    res.status(500).json({ success: false, message: "Error al obtener reportes." });
  }
};

/* ---------------------- OBTENER UN REPORTE ---------------------- */
export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId).populate("reporter", "username fullName avatar");

    if (!report) return res.status(404).json({ success: false, message: "Reporte no encontrado." });

    // Solo admin o quien lo creó puede ver detalles completos
    if (!req.isAdmin && report.reporter._id.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Acceso denegado." });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("Error obteniendo reporte:", error);
    res.status(500).json({ success: false, message: "Error al obtener reporte." });
  }
};

/* ---------------------- ACTUALIZAR REPORTE (ADMIN) ---------------------- */
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, moderatorNote } = req.body;

    const report = await Report.findById(reportId);

    if (!report) return res.status(404).json({ success: false, message: "Reporte no encontrado." });

    if (status) report.status = status;
    if (moderatorNote !== undefined) report.moderatorNote = moderatorNote;

    await report.save();

    res.status(200).json({ success: true, message: "Reporte actualizado exitosamente.", report });
  } catch (error) {
    console.error("Error actualizando reporte:", error);
    res.status(500).json({ success: false, message: "Error al actualizar reporte." });
  }
};
