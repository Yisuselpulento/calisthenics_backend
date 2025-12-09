import User from "../models/user.model.js";
import UserSkill from "../models/userSkill.model.js";

export const getUserStats = async (userId) => {
  const user = await User.findById(userId).populate({
    path: "skills",
    populate: { path: "skill", model: "Skill" },
  });

  if (!user) return null;

  let staticAura = 0, dynamicAura = 0, energy = 0;

  for (const userSkill of user.skills) {
    const skill = userSkill.skill;
    if (!skill) continue;

    for (const variant of userSkill.variants) {
      const skillVariant = skill.variants.find(v => v.variantKey === variant.variantKey);
      if (!skillVariant) continue;

      staticAura += skillVariant.staticAu;
      dynamicAura += skillVariant.dynamicAu;
      energy += (skillVariant.stats.energyPerRep || 0) + (skillVariant.stats.energyPerSecond || 0);
    }
  }

  user.stats.staticAura = staticAura;
  user.stats.dynamicAura = dynamicAura;
  user.stats.mainAura = staticAura + dynamicAura;
  user.stats.energy = energy;
  user.stats.lastUpdated = new Date();

  await user.save();

  return user.stats;
};