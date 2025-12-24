const readyChecks = new Map();
// key: matchId
// value: { players: Set, timer }

export const startReadyCheck = (io, matchId, players, timeout = 15000) => {
  readyChecks.set(matchId, {
    players: new Set(),
    timer: setTimeout(() => {
      cancelReadyCheck(io, matchId, players);
    }, timeout),
  });

  players.forEach(userId => {
    io.to(userId.toString()).emit("ranked:readyCheck", {
      matchId,
      timeout,
    });
  });
};

export const confirmReady = (io, matchId, userId) => {
  const check = readyChecks.get(matchId);
  if (!check) return false;

  check.players.add(userId);

  if (check.players.size === 2) {
    clearTimeout(check.timer);
    readyChecks.delete(matchId);
    return true; // ambos aceptaron
  }

  return false;
};

export const cancelReadyCheck = (io, matchId, players) => {
  const check = readyChecks.get(matchId);
  if (!check) return;

  clearTimeout(check.timer);
  readyChecks.delete(matchId);

  players.forEach(userId => {
    io.to(userId.toString()).emit("ranked:cancelled", {
      reason: "timeout",
    });
  });
};
