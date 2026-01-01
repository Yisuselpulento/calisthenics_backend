
const lockedUsers = new Map();

/**
 * 🔒 Lock de usuario
 * @param {string|ObjectId} userId
 * @param {Object} options
 * @param {number} options.ttl - tiempo en ms para auto-unlock
 */
export const lockUser = (userId, options = {}) => {
  const key = userId.toString();

  // Si ya está lockeado, no hacer nada
  if (lockedUsers.has(key)) return;

  let timeoutId = null;

  if (options.ttl) {
    timeoutId = setTimeout(() => {
      lockedUsers.delete(key);
    }, options.ttl);
  }

  lockedUsers.set(key, timeoutId);
};

/**
 * 🔓 Unlock manual
 */
export const unlockUser = (userId) => {
  const key = userId.toString();
  const timeoutId = lockedUsers.get(key);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  lockedUsers.delete(key);
};

/**
 * 🔍 Check lock
 */
export const isUserLocked = (userId) => {
  return lockedUsers.has(userId.toString());
};
