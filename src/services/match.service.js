import Match from "../models/match.model.js";
import { calculateMatchResults } from "../utils/calculateMatchResults.js";
import { getIO } from "../Sockets/io.js";
import { emitToUser } from "../Sockets/matchSockets.js";
import User from "../models/user.model.js";

const MatchService = {
  createMatchFromChallenge: async (challenge) => {
    const [userA, userB] = await Promise.all([
      User.findById(challenge.fromUser),
      User.findById(challenge.toUser),
    ]);

    // Calcular resultados
    const [userAResult, userBResult] = await Promise.all([
      calculateMatchResults(userA, challenge.type),
      calculateMatchResults(userB, challenge.type),
    ]);

    // Determinar el ganador
    const userAWinner = userAResult.totalPoints >= userBResult.totalPoints;
    const userBWinner = !userAWinner;

    // Crear el match en la base de datos
    const match = await Match.create({
      players: [userA._id, userB._id],
      playerData: [
        {
          user: userA._id,
          combo: userAResult.combo._id,
          points: userAResult.totalPoints,
          energySpent: userAResult.energySpent,
          breakdown: userAResult.breakdown,
        },
        {
          user: userB._id,
          combo: userBResult.combo._id,
          points: userBResult.totalPoints,
          energySpent: userBResult.energySpent,
          breakdown: userBResult.breakdown,
        },
      ],
      winner: userAWinner ? userA._id : userB._id,
      loser: userAWinner ? userB._id : userA._id,
      mode: challenge.type,
      matchType: challenge.matchType,
      points: Math.abs(userAResult.totalPoints - userBResult.totalPoints),
      energySpent: userAResult.energySpent + userBResult.energySpent,
    });

    // Actualizar los usuarios con el nuevo match
    await Promise.all([
      User.findByIdAndUpdate(userA._id, { $push: { match: match._id } }),
      User.findByIdAndUpdate(userB._id, { $push: { match: match._id } }),
    ]);

    // Emitir eventos por socket
    const io = getIO();
    emitToUser(io, userA._id, "matchCompleted", { matchId: match._id });
    emitToUser(io, userB._id, "matchCompleted", { matchId: match._id });

    return {
      match,
      results: {
        user: {
          combo: userAResult.combo,
          totalPoints: userAResult.totalPoints,
          isWinner: userAWinner,
          stepData: userAResult.stepData,
        },
        opponent: {
          combo: userBResult.combo,
          totalPoints: userBResult.totalPoints,
          isWinner: userBWinner,
          stepData: userBResult.stepData,
        },
      },
    };
  },
};

export default MatchService;
