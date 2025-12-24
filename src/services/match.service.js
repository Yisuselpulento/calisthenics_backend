import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import { calculateMatchResults } from "../utils/calculateMatchResults.js";
import { getIO } from "../Sockets/io.js";
import { emitToUser } from "../Sockets/emit.js";

const MatchService = {
  createMatchFromChallenge: async (challenge) => {
    /* ---------------------- VALIDATION ---------------------- */

    if (challenge.matchType !== "casual") {
      throw new Error("MatchService solo permite matches casuales");
    }

    /* ---------------------- USERS ---------------------- */

    const [userA, userB] = await Promise.all([
      User.findById(challenge.fromUser),
      User.findById(challenge.toUser),
    ]);

    if (!userA || !userB) {
      throw new Error("Usuarios del match no encontrados");
    }

    /* ---------------------- CALCULATE RESULTS ---------------------- */

    const [resA, resB] = await Promise.all([
      calculateMatchResults(userA, challenge.type),
      calculateMatchResults(userB, challenge.type),
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

    /* ---------------------- PLAYER DATA ---------------------- */

    const playerData = [
      {
        user: userA._id,
        combo: resA.combo._id,
        points: resA.totalPoints,
        energySpent: 0,
        result: resultA,
        eloBefore: null,
        eloAfter: null,
        breakdown: {
          elementsStepData: resA.stepData,
        },
      },
      {
        user: userB._id,
        combo: resB.combo._id,
        points: resB.totalPoints,
        energySpent: 0,
        result: resultB,
        eloBefore: null,
        eloAfter: null,
        breakdown: {
          elementsStepData: resB.stepData,
        },
      },
    ];

    /* ---------------------- CREATE MATCH ---------------------- */

    const match = await Match.create({
      players: [userA._id, userB._id],
      playerData,
      winner,
      loser,
      mode: challenge.type,
      matchType: "casual",
      points: Math.abs(resA.totalPoints - resB.totalPoints),
      energySpent: 0,
      rulesSnapshot: {
        type: challenge.type,
        matchType: "casual",
      },
    });

    /* ---------------------- LINK MATCH ---------------------- */

    await Promise.all([
      User.updateOne(
        { _id: userA._id },
        { $push: { "matches.casual": match._id } }
      ),
      User.updateOne(
        { _id: userB._id },
        { $push: { "matches.casual": match._id } }
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
          result: resultA,
          stepData: resA.stepData,
        },
        opponent: {
          combo: resB.combo,
          totalPoints: resB.totalPoints,
          result: resultB,
          stepData: resB.stepData,
        },
      },
    };
  },
};

export default MatchService;
