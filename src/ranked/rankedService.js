import { rankedQueue } from "./rankedQueue.js";

export const findOrQueuePlayer = ({ mode, player }) => {
   if (!player?.userId || !player?.sessionId) return null;

   const alreadyInQueue = rankedQueue[mode].some(
  p => p.userId.toString() === player.userId.toString()
);

if (alreadyInQueue) {
  console.warn("⚠️ Usuario ya estaba en cola");
  return null;
}

  rankedQueue[mode] = rankedQueue[mode] || [];
  const queue = rankedQueue[mode];

  const opponent = queue.find(
    p =>
      Math.abs(p.elo - player.elo) <= 100 &&
      p.userId !== player.userId
  );

  if (opponent) {
    // Sacar del queue
    rankedQueue[mode] = queue.filter(p => p.userId !== opponent.userId);
    return opponent;
  }

  // Agregar al queue
  queue.push(player);
  return null;
};

export const removeFromQueue = (mode, userId, sessionId) => {
  if (!rankedQueue[mode] || !userId || !sessionId) return;

  rankedQueue[mode] = rankedQueue[mode].filter(
    p =>
      p.userId.toString() !== userId.toString() ||
      p.sessionId !== sessionId
  );

  console.log(`🚫 ${userId} eliminado de cola ${mode}`);
};