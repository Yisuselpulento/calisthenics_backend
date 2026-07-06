// controllers/energy.controller.js

import User from "../models/user.model.js";
import { applyEnergyRegen } from "../services/energy.service.js";
import { grantProduct } from "../services/entitlement.service.js";

/**
 * Controlador 1: Boost temporal de energía (x2 regeneración por 3 días)
 */
export const buyEnergyBoost = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    // ⚠️ TEMPORAL: otorga GRATIS. En la Fase 1 (pagos) esto se reemplaza por el
    // flujo verificado (webhook → processPurchase). No dejar libre una vez que se cobre.
    await grantProduct(user, "boost_x2_3d");

    return res.status(200).json({
      success: true,
      message: "Boost x2 activado por 3 días",
      user: {
        _id: user._id,
        energy: user.stats.energy,
        energyRegenMultiplier: user.stats.energyRegenMultiplier,
        energyRegenBoostUntil: user.stats.energyRegenBoostUntil,
      },
    });
  } catch (err) {
    console.error("Error en buyEnergyBoost:", err);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

/**
 * Controlador 2: Recarga completa de energía (instantánea)
 */
export const buyFullEnergy = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    // ⚠️ TEMPORAL: otorga GRATIS. En la Fase 1 (pagos) se reemplaza por el flujo verificado.
    await grantProduct(user, "full_energy");

    return res.status(200).json({
      success: true,
      message: "Energía recargada al máximo",
      user: {
        _id: user._id,
        energy: user.stats.energy,
      },
    });
  } catch (err) {
    console.error("Error en buyFullEnergy:", err);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

/**
 * Controlador extra: Consultar energía actual
 */
export const getEnergy = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    applyEnergyRegen(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Energía actualizada correctamente",
      user: {
        _id: user._id,
        energy: user.stats.energy,
        energyRegenMultiplier: user.stats.energyRegenMultiplier,
        energyRegenBoostUntil: user.stats.energyRegenBoostUntil,
      },
    });
  } catch (err) {
    console.error("Error en getEnergy:", err);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};
