import { unlockUser } from "./rankedLocks.js";

const acceptChecks = new Map();
// matchId -> { accepted: Set, timer, players }

export const startAcceptCheck = (io, matchId, players, timeout = 10000) => {
  acceptChecks.set(matchId, {
    accepted: new Set(),
    players,
    timer: setTimeout(() => {
      cancelAcceptCheck(io, matchId, players);
    }, timeout),
  });
};

    export const confirmAccept = (io, matchId, userId) => {
      const check = acceptChecks.get(matchId);
      if (!check) return false;

      if (check.accepted.has(userId.toString())) {
        return false; // 🚫 ya aceptó
      }

      check.accepted.add(userId.toString());

      if (check.accepted.size === check.players.length) {
        clearTimeout(check.timer);
        acceptChecks.delete(matchId);
        return true;
      }

      return false;
    };

export const cancelAcceptCheck = (io, matchId, players) => {
  const check = acceptChecks.get(matchId);
  if (!check) return;

  clearTimeout(check.timer);
  acceptChecks.delete(matchId);

  players.forEach((userId) => {
    unlockUser(userId); // 🔓 liberar a TODOS
    io.to(userId.toString()).emit("ranked:cancelled", {
      reason: "timeout",
    });
  });
};
