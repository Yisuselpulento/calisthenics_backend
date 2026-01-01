import { rankedQueue } from "./rankedQueue.js";

// rankedService.js
export const findOrQueuePlayer = ({ mode, player }) => {
  if (!player?.userId) return null;

  rankedQueue[mode] = rankedQueue[mode] || [];
  const queue = rankedQueue[mode];

  // ❌ Buscar oponente
  const opponent = queue.find(
    p =>
      Math.abs(p.elo - player.elo) <= 100 &&
      p.userId.toString() !== player.userId.toString()
  );

  if (opponent) {
    // Sacar al oponente de la cola
    rankedQueue[mode] = queue.filter(
      p => p.userId.toString() !== opponent.userId.toString()
    );
    return opponent;
  }

  // Agregar jugador actual a la cola
  queue.push(player);
  return null;
};

export const removeFromQueue = (mode, userId) => {
  if (!rankedQueue[mode] || !userId) return;

  rankedQueue[mode] = rankedQueue[mode].filter(
    p => p.userId.toString() !== userId.toString()
  );

  console.log(`🚫 ${userId} eliminado de cola ${mode}`);
};
