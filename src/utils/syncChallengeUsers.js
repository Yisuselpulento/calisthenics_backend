import { getIO } from "../Sockets/io.js";
import { emitToUser } from "../Sockets/matchSockets.js";
import { getAuthUser } from "./getAuthUser.js";

export const syncChallengeUsers = async (challenge) => {
  const io = getIO();

  const updatedToUser = await getAuthUser(challenge.toUser);
  const updatedFromUser = await getAuthUser(challenge.fromUser);

  emitToUser(io, challenge.toUser, "userUpdated", {
    user: updatedToUser,
  });

  emitToUser(io, challenge.fromUser, "userUpdated", {
    user: updatedFromUser,
  });
};
