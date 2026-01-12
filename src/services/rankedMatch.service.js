import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import { calculateMatchResults } from "../utils/calculateMatchResults.js";
import { getIO } from "../Sockets/io.js";
import { emitToUser } from "../Sockets/emit.js";
import { consumeEnergy } from "./energy.service.js";
import { calculateTier } from "../utils/calculateTier.js";

const RANKED_ENERGY_COST = 333;
const K_FACTOR = 32;

const RankedMatchService = {
  createRankedMatch: async ({ userAId, userBId, type, eloSnapshot }) => {
    // ---------------- VALIDACIONES BASE ----------------
    if (!eloSnapshot?.userA || !eloSnapshot?.userB) {
      throw new Error("eloSnapshot inválido");
    }

    if (!["static", "dynamic"].includes(type)) {
      throw new Error("Tipo de ranked inválido");
    }

    // ---------------- USUARIOS ----------------
    const [userA, userB] = await Promise.all([
      User.findById(userAId),
      User.findById(userBId),
    ]);

    if (!userA || !userB) {
      throw new Error("Usuarios no encontrados");
    }

    // ---------------- ENERGÍA ----------------
    if (userA.stats.energy < RANKED_ENERGY_COST) {
      throw new Error("UserA sin energía");
    }
    if (userB.stats.energy < RANKED_ENERGY_COST) {
      throw new Error("UserB sin energía");
    }

    // ---------------- RESULTADOS ----------------
    const [resA, resB] = await Promise.all([
      calculateMatchResults(userA, type),
      calculateMatchResults(userB, type),
    ]);

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

    // ---------------- ELO ----------------
    const expectedA =
      1 / (1 + Math.pow(10, (eloSnapshot.userB - eloSnapshot.userA) / 400));
    const expectedB = 1 - expectedA;

    const scoreA = resultA === "win" ? 1 : resultA === "loss" ? 0 : 0.5;
    const scoreB = 1 - scoreA;

    const newEloA = Math.round(
      eloSnapshot.userA + K_FACTOR * (scoreA - expectedA)
    );
    const newEloB = Math.round(
      eloSnapshot.userB + K_FACTOR * (scoreB - expectedB)
    );

    // ---------------- ENERGÍA ----------------
    consumeEnergy(userA, RANKED_ENERGY_COST);
    consumeEnergy(userB, RANKED_ENERGY_COST);

    // ---------------- RANKING ----------------
    userA.ranking[type].elo = newEloA;
    userB.ranking[type].elo = newEloB;

    userA.ranking[type].tier = calculateTier(newEloA);
    userB.ranking[type].tier = calculateTier(newEloB);

    if (resultA === "win") {
      userA.ranking[type].wins++;
      userB.ranking[type].losses++;
    } else if (resultB === "win") {
      userB.ranking[type].wins++;
      userA.ranking[type].losses++;
    } else {
      userA.ranking[type].draws = (userA.ranking[type].draws || 0) + 1;
      userB.ranking[type].draws = (userB.ranking[type].draws || 0) + 1;
    }

    // ---------------- GUARDAR USERS ----------------
    await Promise.all([userA.save(), userB.save()]);

    // ---------------- MATCH ----------------
    const match = await Match.create({
      players: [userA._id, userB._id],
      winner,
      loser,
      mode: type,
      matchType: "ranked",
      points: Math.abs(resA.totalPoints - resB.totalPoints),
      energySpent: RANKED_ENERGY_COST * 2,
      playerData: [
        {
          user: userA._id,
          combo: resA.combo._id,
          points: resA.totalPoints,
          energySpent: RANKED_ENERGY_COST,
          result: resultA,
          eloBefore: eloSnapshot.userA,
          eloAfter: newEloA,
          breakdown: { elementsStepData: resA.stepData },
        },
        {
          user: userB._id,
          combo: resB.combo._id,
          points: resB.totalPoints,
          energySpent: RANKED_ENERGY_COST,
          result: resultB,
          eloBefore: eloSnapshot.userB,
          eloAfter: newEloB,
          breakdown: { elementsStepData: resB.stepData },
        },
      ],
      rulesSnapshot: {
        type,
        matchType: "ranked",
        rankedEnergyCost: RANKED_ENERGY_COST,
        kFactor: K_FACTOR,
      },
    });

    // ---------------- REFERENCIA EN USERS ----------------
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

    // ---------------- SOCKET EVENT ----------------
    const io = getIO();
    emitToUser(io, userA._id, "rankedMatchCompleted", { matchId: match._id });
    emitToUser(io, userB._id, "rankedMatchCompleted", { matchId: match._id });

    return { match };
  },
};

export default RankedMatchService;
