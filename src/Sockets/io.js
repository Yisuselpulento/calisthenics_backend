let io = null;

export const setIO = (serverIO) => {
  io = serverIO;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO no inicializado");
  return io;
};
