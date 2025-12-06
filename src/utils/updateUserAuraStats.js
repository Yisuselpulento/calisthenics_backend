import User from "../models/user.model.js";
import Skill from "../models/skill.model.js";


export const updateUserAuraStats = async (userId) => {
  const user = await User.findById(userId).populate({
    path: "skills",
    populate: {
      path: "skill",
      model: "Skill",
    },
  });

  if (!user) return null;

  let staticAura = 0;
  let dynamicAura = 0;
  let energy = 0;

  for (const userSkill of user.skills) {
    const skill = await Skill.findById(userSkill.skill);

    if (!skill) continue;

    for (const variant of userSkill.variants) {
      const skillVariant = skill.variants.find(v => v.variantKey === variant.variantKey);
      if (!skillVariant) continue;

      staticAura += skillVariant.staticAu;
      dynamicAura += skillVariant.dynamicAu;

      energy +=
        (skillVariant.stats.energyPerRep || 0) +
        (skillVariant.stats.energyPerSecond || 0);
    }
  }

  user.stats.staticAura = staticAura;
  user.stats.dynamicAura = dynamicAura;
  user.stats.mainAura = staticAura + dynamicAura;
  user.stats.energy = energy;

  await user.save();
  return user;
};
