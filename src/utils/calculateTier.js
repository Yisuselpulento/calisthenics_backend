export const calculateTier = (elo) => {
  if (elo < 1000) return "Bronze";
  if (elo < 1500) return "Silver";
  if (elo < 2000) return "Gold";
  return "Diamond";
};
