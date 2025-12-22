import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import { calculateMatchResults } from "../utils/calculateMatchResults.js";
import { getIO } from "../Sockets/io.js";
import { emitToUser } from "../Sockets/matchSockets.js";

const RANKED_ENERGY_COST = 333;

const MatchService = {
  createMatchFromChallenge: async (challenge) => {
    /* ---------------------- USERS ---------------------- */
    const [userA, userB] = await Promise.all([
      User.findById(challenge.fromUser),
      User.findById(challenge.toUser),
    ]);

    if (!userA || !userB) {
      throw new Error("Usuarios del match no encontrados");
    }

    /* ---------------------- RANKED VALIDATIONS ---------------------- */
    if (challenge.matchType === "ranked") {
      if (!challenge.eloSnapshot) {
        throw new Error("Ranked sin eloSnapshot");
      }

      if (
        challenge.eloSnapshot.fromUser === null ||
        challenge.eloSnapshot.toUser === null
      ) {
        throw new Error("eloSnapshot incompleto en ranked");
      }

      if (userA.stats.energy < RANKED_ENERGY_COST) {
        throw new Error("User A sin energía suficiente para ranked");
      }

      if (userB.stats.energy < RANKED_ENERGY_COST) {
        throw new Error("User B sin energía suficiente para ranked");
      }
    }

    /* ---------------------- CALCULATE RESULTS ---------------------- */
    const [resA, resB] = await Promise.all([
      calculateMatchResults(userA, challenge.type),
      calculateMatchResults(userB, challenge.type),
    ]);

    /* ---------------------- WINNER / LOSER ---------------------- */
    let resultA = "draw";
    let resultB = "draw";
    let winner = null;
    let loser = null;

    if (resA.totalPoints > resB.totalPoints) {
      resultA = "win";
      resultB = "loss";
      winner = userA._id;
      loser = userB._id;
    } else if (resB.totalPoints > resA.totalPoints) {
      resultA = "loss";
      resultB = "win";
      winner = userB._id;
      loser = userA._id;
    }

    /* ---------------------- ENERGY ---------------------- */
    const energySpent =
      challenge.matchType === "ranked" ? RANKED_ENERGY_COST : 0;

    /* ---------------------- PLAYER DATA ---------------------- */
    const playerData = [
      {
        user: userA._id,
        combo: resA.combo._id,
        points: resA.totalPoints,
        energySpent,
        result: resultA,
        eloBefore:
          challenge.matchType === "ranked"
            ? challenge.eloSnapshot.fromUser
            : null,
        eloAfter: null,
        breakdown: resA.stepData,
      },
      {
        user: userB._id,
        combo: resB.combo._id,
        points: resB.totalPoints,
        energySpent,
        result: resultB,
        eloBefore:
          challenge.matchType === "ranked"
            ? challenge.eloSnapshot.toUser
            : null,
        eloAfter: null,
        breakdown: resB.stepData,
      },
    ];

    /* ---------------------- ELO UPDATE (RANKED) ---------------------- */
    if (challenge.matchType === "ranked" && winner && loser) {
      const K = 32;

      const expectedA =
        1 /
        (1 +
          Math.pow(
            10,
            (challenge.eloSnapshot.toUser -
              challenge.eloSnapshot.fromUser) /
              400
          ));

      const expectedB = 1 - expectedA;

      const scoreA = resultA === "win" ? 1 : 0;
      const scoreB = resultB === "win" ? 1 : 0;

      const newEloA = Math.round(
        challenge.eloSnapshot.fromUser + K * (scoreA - expectedA)
      );

      const newEloB = Math.round(
        challenge.eloSnapshot.toUser + K * (scoreB - expectedB)
      );

      playerData[0].eloAfter = newEloA;
      playerData[1].eloAfter = newEloB;

      userA.ranking.elo = newEloA;
      userB.ranking.elo = newEloB;

      if (resultA === "win") {
        userA.ranking.wins++;
        userB.ranking.losses++;
      } else if (resultB === "win") {
        userB.ranking.wins++;
        userA.ranking.losses++;
      }

      userA.updateTier();
      userB.updateTier();
    }

    /* ---------------------- ENERGY DISCOUNT (RANKED ONLY) ---------------------- */
    if (challenge.matchType === "ranked") {
      userA.stats.energy = Math.max(
        0,
        userA.stats.energy - RANKED_ENERGY_COST
      );
      userB.stats.energy = Math.max(
        0,
        userB.stats.energy - RANKED_ENERGY_COST
      );
    }

    await Promise.all([userA.save(), userB.save()]);

    /* ---------------------- CREATE MATCH ---------------------- */
    const match = await Match.create({
      players: [userA._id, userB._id],
      playerData,
      winner,
      loser,
      mode: challenge.type,
      matchType: challenge.matchType,
      points: Math.abs(resA.totalPoints - resB.totalPoints),
      energySpent: energySpent * 2,
      rulesSnapshot: {
        type: challenge.type,
        matchType: challenge.matchType,
        rankedEnergyCost: RANKED_ENERGY_COST,
      },
    });

    /* ---------------------- LINK MATCH ---------------------- */
    const matchField =
      challenge.matchType === "ranked"
        ? "matches.ranked"
        : "matches.casual";

    await Promise.all([
      User.updateOne(
        { _id: userA._id },
        { $push: { [matchField]: match._id } }
      ),
      User.updateOne(
        { _id: userB._id },
        { $push: { [matchField]: match._id } }
      ),
    ]);

    /* ---------------------- SOCKET EVENTS ---------------------- */
    const io = getIO();
    emitToUser(io, userA._id, "matchCompleted", { matchId: match._id });
    emitToUser(io, userB._id, "matchCompleted", { matchId: match._id });

    /* ---------------------- RESPONSE ---------------------- */
    return {
      match,
      results: {
        user: {
          combo: resA.combo,
          totalPoints: resA.totalPoints,
          isWinner: resultA === "win",
          stepData: resA.stepData,
        },
        opponent: {
          combo: resB.combo,
          totalPoints: resB.totalPoints,
          isWinner: resultB === "win",
          stepData: resB.stepData,
        },
      },
    };
  },
};

export default MatchService;
