const MAX_ENERGY = 1000;
const BASE_REGEN_PER_MINUTE = 10; // ajusta esto a tu juego

export const applyEnergyRegen = (user) => {
  const stats = user.stats;

  if (stats.energy >= MAX_ENERGY) {
    stats.energy = MAX_ENERGY;
    stats.energyLastUpdatedAt = new Date();
    return;
  }

  const now = Date.now();
  const last = new Date(stats.energyLastUpdatedAt).getTime();
  const diffMinutes = Math.floor((now - last) / 60000);

  if (diffMinutes <= 0) return;

  // 🔥 Boost activo?
  let multiplier = 1;
  if (stats.energyRegenBoostUntil && stats.energyRegenBoostUntil > new Date()) {
    multiplier = stats.energyRegenMultiplier;
  }

  const energyToRestore =
    diffMinutes * BASE_REGEN_PER_MINUTE * multiplier;

  stats.energy = Math.min(MAX_ENERGY, stats.energy + energyToRestore);
  stats.energyLastUpdatedAt = new Date(last + diffMinutes * 60000);
};

export const consumeEnergy = (user, amount) => {
  if (user.stats.energy < amount) {
    throw new Error("Energía insuficiente");
  }

  user.stats.energy -= amount;
};
