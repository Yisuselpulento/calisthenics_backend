import User from "../models/user.model.js";
import UserSkill from "../models/userSkill.model.js";

export const recalculateUserStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return;

  const userSkills = await UserSkill.find({ user: user._id }).populate("skill");
  
  let staticAura = 0;
  let dynamicAura = 0;

  for (const us of userSkills) {
    for (const variant of us.variants) {
      const skillVariant = us.skill.variants.find(v => v.variantKey === variant.variantKey);
      if (!skillVariant) continue;
      staticAura += skillVariant.staticAu || 0;
      dynamicAura += skillVariant.dynamicAu || 0;
    }
  }

  user.stats.staticAura = staticAura;
  user.stats.dynamicAura = dynamicAura;
  user.stats.mainAura = staticAura + dynamicAura;
  user.stats.lastUpdated = new Date();

  await user.save();
};
