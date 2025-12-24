import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import { calculateMatchResults } from "../utils/calculateMatchResults.js";
import { getIO } from "../Sockets/io.js";
import { emitToUser } from "../Sockets/matchSockets.js";

const RANKED_ENERGY_COST = 333;
const K_FACTOR = 32;

const RankedMatchService = {
  /**
   * @param {Object} params
   * @param {string} params.userAId
   * @param {string} params.userBId
   * @param {string} params.type        // static | dynamic
   * @param {Object} params.eloSnapshot  // { userA: number, userB: number }
   */
  createRankedMatch: async ({
    userAId,
    userBId,
    type,
    eloSnapshot,
  }) => {
    /* ---------------------- USERS ---------------------- */

    const [userA, userB] = await Promise.all([
      User.findById(userAId),
      User.findById(userBId),
    ]);

    if (!userA || !userB) {
      throw new Error("Usuarios del match ranked no encontrados");
    }

    /* ---------------------- VALIDATIONS ---------------------- */

    if (!eloSnapshot || eloSnapshot.userA == null || eloSnapshot.userB == null) {
      throw new Error("Ranked requiere eloSnapshot válido");
    }

    if (userA.stats.energy < RANKED_ENERGY_COST) {
      throw new Error("User A sin energía suficiente para ranked");
    }

    if (userB.stats.energy < RANKED_ENERGY_COST) {
      throw new Error("User B sin energía suficiente para ranked");
    }

    if (!["static", "dynamic"].includes(type)) {
      throw new Error("Tipo de ranked inválido");
    }

    /* ---------------------- CALCULATE RESULTS ---------------------- */

    const [resA, resB] = await Promise.all([
      calculateMatchResults(userA, type),
      calculateMatchResults(userB, type),
    ]);

    /* ---------------------- RESULT ---------------------- */

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

    /* ---------------------- ELO CALCULATION ---------------------- */

    let newEloA = eloSnapshot.userA;
    let newEloB = eloSnapshot.userB;

    const expectedA =
      1 /
      (1 +
        Math.pow(
          10,
          (eloSnapshot.userB - eloSnapshot.userA) / 400
        ));

    const expectedB = 1 - expectedA;

    let scoreA = 0.5;
    let scoreB = 0.5;

    if (resultA === "win") {
      scoreA = 1;
      scoreB = 0;
    } else if (resultB === "win") {
      scoreA = 0;
      scoreB = 1;
    }

    newEloA = Math.round(
      eloSnapshot.userA + K_FACTOR * (scoreA - expectedA)
    );

    newEloB = Math.round(
      eloSnapshot.userB + K_FACTOR * (scoreB - expectedB)
    );

    /* ---------------------- PLAYER DATA ---------------------- */

    const playerData = [
      {
        user: userA._id,
        combo: resA.combo._id,
        points: resA.totalPoints,
        energySpent: RANKED_ENERGY_COST,
        result: resultA,
        eloBefore: eloSnapshot.userA,
        eloAfter: newEloA,
        breakdown: {
          elementsStepData: resA.stepData,
        },
      },
      {
        user: userB._id,
        combo: resB.combo._id,
        points: resB.totalPoints,
        energySpent: RANKED_ENERGY_COST,
        result: resultB,
        eloBefore: eloSnapshot.userB,
        eloAfter: newEloB,
        breakdown: {
          elementsStepData: resB.stepData,
        },
      },
    ];

    /* ---------------------- USER UPDATES ---------------------- */

    userA.ranking.elo = newEloA;
    userB.ranking.elo = newEloB;

    if (resultA === "win") {
      userA.ranking.wins++;
      userB.ranking.losses++;
    } else if (resultB === "win") {
      userB.ranking.wins++;
      userA.ranking.losses++;
    } else {
      userA.ranking.draws++;
      userB.ranking.draws++;
    }

    userA.stats.energy = Math.max(0, userA.stats.energy - RANKED_ENERGY_COST);
    userB.stats.energy = Math.max(0, userB.stats.energy - RANKED_ENERGY_COST);

    userA.updateTier();
    userB.updateTier();

    await Promise.all([userA.save(), userB.save()]);

    /* ---------------------- CREATE MATCH ---------------------- */

    const match = await Match.create({
      players: [userA._id, userB._id],
      playerData,
      winner,
      loser,
      mode: type,
      matchType: "ranked",
      points: Math.abs(resA.totalPoints - resB.totalPoints),
      energySpent: RANKED_ENERGY_COST * 2,
      rulesSnapshot: {
        type,
        matchType: "ranked",
        rankedEnergyCost: RANKED_ENERGY_COST,
        kFactor: K_FACTOR,
      },
    });

    /* ---------------------- LINK MATCH ---------------------- */

    await Promise.all([
      User.updateOne(
        { _id: userA._id },
        { $push: { "matches.ranked": match._id } }
      ),
      User.updateOne(
        { _id: userB._id },
        { $push: { "matches.ranked": match._id } }
      ),
    ]);

    /* ---------------------- SOCKET EVENTS ---------------------- */

    const io = getIO();
    emitToUser(io, userA._id, "rankedMatchCompleted", { matchId: match._id });
    emitToUser(io, userB._id, "rankedMatchCompleted", { matchId: match._id });

    /* ---------------------- RESPONSE ---------------------- */

    return {
      match,
      results: {
        userA: {
          combo: resA.combo,
          totalPoints: resA.totalPoints,
          result: resultA,
          eloBefore: eloSnapshot.userA,
          eloAfter: newEloA,
        },
        userB: {
          combo: resB.combo,
          totalPoints: resB.totalPoints,
          result: resultB,
          eloBefore: eloSnapshot.userB,
          eloAfter: newEloB,
        },
      },
    };
  },
};

export default RankedMatchService;
