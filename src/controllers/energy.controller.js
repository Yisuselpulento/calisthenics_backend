// controllers/energy.controller.js

import User from "../models/user.model.js";
import { applyEnergyRegen } from "../services/energy.service.js";

const MAX_ENERGY = 1000;

/**
 * Controlador 1: Boost temporal de energía (x2 regeneración por 3 días)
 */
export const buyEnergyBoost = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const BOOST_MULTIPLIER = 2; // x2 regeneración
    const BOOST_DURATION_DAYS = 3;

    user.stats.energyRegenMultiplier = BOOST_MULTIPLIER;
    user.stats.energyRegenBoostUntil = new Date(
      Date.now() + BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

    // Aplica regeneración antes de guardar
    applyEnergyRegen(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Boost activado: x${BOOST_MULTIPLIER} regeneración por ${BOOST_DURATION_DAYS} días`,
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

    // Aplica regeneración antes de recargar full
    applyEnergyRegen(user);

    user.stats.energy = MAX_ENERGY;
    user.stats.energyLastUpdatedAt = new Date();

    await user.save();

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
