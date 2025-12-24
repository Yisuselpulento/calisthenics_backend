export const emitToUser = (io, userId, event, payload) => {
  io.to(userId.toString()).emit(event, payload);
};