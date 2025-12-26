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
    .populate({
      path: "matches.ranked",
      model: "Match",
    })
    .populate({
      path: "matches.casual",
      model: "Match",
    })
    .populate("notifications");

  if (!user) return null;

  // Procesar favoriteSkills
  const favoriteSkills = user.favoriteSkills
    .map((fs) => {
      if (!fs.userSkill || !fs.userSkillVariantId) return null;
      const userVariant = fs.userSkill.variants.find(
        (v) => v._id.toString() === fs.userSkillVariantId.toString()
      );
      if (!userVariant) return null;

      const skillVariant = fs.userSkill.skill.variants.find(
        (v) => v.variantKey === userVariant.variantKey
      );

      return {
        favoriteSkillId: fs._id,
        userSkillId: fs.userSkill._id,
        skillId: fs.userSkill.skill._id,
        userSkillVariantId: userVariant._id,
        variantBaseId: skillVariant?._id || null,
        variantKey: userVariant.variantKey,
        fingers: userVariant.fingers,
        video: userVariant.video,
        name: skillVariant?.name || userVariant.variantKey,
        type: skillVariant?.type || "static",
      };
    })
    .filter(Boolean);

  // Ordenar skills por creación
  const sortedSkills = [...user.skills].sort(
    (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
  );

  const skills = sortedSkills.map((us) => ({
    userSkillId: us._id,
    skillId: us.skill._id,
    skillName: us.skill.name,
    variants: us.variants.map((uv) => {
      const skillVariant = us.skill.variants.find(
        (v) => v.variantKey === uv.variantKey
      );
      return {
        userSkillVariantId: uv._id,
        variantKey: uv.variantKey,
        fingers: uv.fingers,
        video: uv.video,
        lastUpdated: uv.lastUpdated,
        stats: skillVariant?.stats || { pointsPerSecond: 0, energyPerSecond: 0, pointsPerRep: 0, energyPerRep: 0 },
        name: skillVariant?.name || uv.variantKey,
        type: skillVariant?.type || "static",
        staticAU: skillVariant?.staticAu || 0,
        dynamicAU: skillVariant?.dynamicAu || 0,
        difficulty: skillVariant?.difficulty || "basic",
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
    matches: user.matches, // ⚠ corregido
  };
};
