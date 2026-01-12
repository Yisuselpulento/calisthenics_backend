const MAX_ENERGY = 1000;

// 1000 energía / 420 minutos ≈ 2.38 → redondeamos a 2.5
const BASE_REGEN_PER_MINUTE = 2.5;

/**
 * Aplica regeneración de energía basada en el tiempo transcurrido
 * desde la última actualización.
 * 
 * ⚠️ Debe llamarse SIEMPRE antes de:
 * - mostrar energía
 * - consumir energía
 * - iniciar un match
 */
export const applyEnergyRegen = (user) => {
  const stats = user.stats;

  if (!stats.energyLastUpdatedAt) {
    stats.energyLastUpdatedAt = new Date();
    return;
  }

  // Si ya está llena, clamp y salimos
  if (stats.energy >= MAX_ENERGY) {
    stats.energy = MAX_ENERGY;
    stats.energyLastUpdatedAt = new Date();
    return;
  }

  const now = Date.now();
  const last = new Date(stats.energyLastUpdatedAt).getTime();

  const diffMinutes = Math.floor((now - last) / 60000);
  if (diffMinutes <= 0) return;

  // 🔥 Boost activo
  let multiplier = 1;
  if (
    stats.energyRegenBoostUntil &&
    stats.energyRegenBoostUntil > new Date()
  ) {
    multiplier = stats.energyRegenMultiplier || 1;
  }

  const energyToRestore =
    diffMinutes * BASE_REGEN_PER_MINUTE * multiplier;

  stats.energy = Math.min(
    MAX_ENERGY,
    stats.energy + energyToRestore
  );

  // Avanzamos el timestamp solo por el tiempo consumido
  stats.energyLastUpdatedAt = new Date(
    last + diffMinutes * 60000
  );
};

/**
 * Consume energía del usuario.
 * ⚠️ Llamar SIEMPRE a applyEnergyRegen(user) antes.
 */
export const consumeEnergy = (user, amount) => {
  if (user.stats.energy < amount) {
    throw new Error("Energía insuficiente");
  }

  user.stats.energy -= amount;
};
