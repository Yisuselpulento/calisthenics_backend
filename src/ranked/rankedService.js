import { rankedQueue } from "./rankedQueue.js";

export const findOrQueuePlayer = ({ mode, player }) => {
  rankedQueue[mode] = rankedQueue[mode] || [];
  const queue = rankedQueue[mode];

  const opponent = queue.find(
    p =>
      Math.abs(p.elo - player.elo) <= 100 &&
      p.userId !== player.userId
  );

  if (opponent) {
    rankedQueue[mode] = queue.filter(p => p.userId !== opponent.userId);
    return opponent;
  }

  queue.push(player);
  return null;
};

export const removeFromQueue = (mode, userId) => {
  if (!rankedQueue[mode]) return;

  rankedQueue[mode] = rankedQueue[mode].filter(
    (p) => p.userId.toString() !== userId.toString()
  );

  console.log(`🚫 ${userId} eliminado de la cola ${mode}`);
};