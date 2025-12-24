const ELO_RANGE = 100;

export const findMatch = (queue, player) => {
  return queue.find(p =>
    Math.abs(p.elo - player.elo) <= ELO_RANGE &&
    p.userId !== player.userId
  );
};
