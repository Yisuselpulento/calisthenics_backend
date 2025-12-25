const lockedUsers = new Set();

export const lockUser = (userId) => {
  lockedUsers.add(userId.toString());
};

export const unlockUser = (userId) => {
  lockedUsers.delete(userId.toString());
};

export const isUserLocked = (userId) => {
  return lockedUsers.has(userId.toString());
};
