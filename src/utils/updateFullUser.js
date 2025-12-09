import User from "../models/user.model.js";
import Skill from "../models/skill.model.js";
import UserSkill from "../models/userSkill.model.js";
import Combo from "../models/combo.model.js";
import Match from "../models/match.model.js";
import Team from "../models/team.model.js";
import Notification from "../models/notification.model.js";

export const UpdateFullUser = async (userId) => {
  const user = await User.findById(userId)
    .populate({
      path: "skills",
      populate: { path: "skill", model: "Skill" },
    })
    .populate({
      path: "favoriteSkills.userSkill",
      populate: { path: "skill", model: "Skill" },
    })
    .populate("combos")
    .populate("followers", "username fullName avatar")
    .populate("following", "username fullName avatar")
    .populate("teams")
    .populate("match")
    .populate("notifications");

  if (!user) return null;

  // Reconstrucción de favoritos incluyendo fingers
  const favoriteSkills = user.favoriteSkills
    .map((fs) => {
      if (!fs.userSkill) return null;

      const variant = fs.userSkill.variants.find(
        (v) => v.variantKey === fs.variantKey && v.fingers === fs.fingers
      );

      if (!variant) return null;

      return {
        _id: fs._id,
        userSkill: fs.userSkill._id,
        skill: fs.userSkill.skill,
        variantKey: variant.variantKey,
        fingers: variant.fingers,
        video: variant.video,
        name: fs.userSkill.skill.variants.find(v => v.variantKey === variant.variantKey)?.name || variant.variantKey,
        type: fs.userSkill.skill.variants.find(v => v.variantKey === variant.variantKey)?.type || "static",
      };
    })
    .filter(Boolean);

  // Reconstrucción de skills con variantes
  const skills = user.skills.map((us) => ({
    _id: us._id,
    skill: us.skill,
    variants: us.variants.map((uv) => {
      const skillVariant = us.skill.variants.find(v => v.variantKey === uv.variantKey);
      return {
        ...uv.toObject(),
        name: skillVariant?.name || uv.variantKey,
        type: skillVariant?.type || "static",
        stats: skillVariant?.stats || {},
        staticAU: skillVariant?.staticAu || 0,
        dynamicAU: skillVariant?.dynamicAu || 0,
        progressionLevel: skillVariant?.progressionLevel || 1,
      };
    }),
  }));

  return {
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    avatar: user.avatar,
    gender: user.gender,
    profileType: user.profileType,
    country: user.country,
    altura: user.altura,
    peso: user.peso,
    videoProfile: user.videoProfile,
    stats: user.stats,
    ranking: user.ranking,
    followers: user.followers,
    following: user.following,
    teams: user.teams,
    notifications: user.notifications,
    notificationsCount: user.notificationsCount,
    favoriteSkills,
    favoriteCombos: user.favoriteCombos,
    skills,
    combos: user.combos,
    match: user.match,
  };
};