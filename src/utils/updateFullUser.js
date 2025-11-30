import User from "../models/user.model.js";
import Skill from "../models/skill.model.js";
import UserSkill from "../models/userSkill.model.js";
import Combo from "../models/combo.model.js";
import Match from "../models/match.model.js";
import Team from "../models/team.model.js";
import Notification from "../models/notification.model.js";

export const UpdateFullUser = async (userId) => {
  const user = await User.findById(userId)

    /* --------- SKILLS --------- */
    .populate({
      path: "skills",
      populate: {
        path: "skill",
        model: "Skill",
      },
    })

    /* --------- COMBOS --------- */
    .populate({
      path: "combos",
      populate: [
        { path: "elements.userSkill", model: "UserSkill" },
        { path: "elements.skill", model: "Skill" },
      ],
    })

    /* --------- MATCHES --------- */
    .populate({
      path: "match",
      populate: [
        { path: "players", select: "username fullName avatar" },
        { path: "winner", select: "username fullName avatar" },
        { path: "loser", select: "username fullName avatar" },
        { path: "comboUsed" },
      ],
    })

    /* --------- TEAMS --------- */
    .populate({
      path: "teams",
      populate: {
        path: "members",
        select: "username fullName avatar",
      },
    })

    /* --------- FOLLOWERS/FOLLOWING --------- */
    .populate("followers", "username fullName avatar")
    .populate("following", "username fullName avatar")

    /* --------- FAVORITE SKILLS --------- */
    .populate({
      path: "favoriteSkills.userSkill",
      populate: {
        path: "skill",
        model: "Skill",
      },
    })

    /* --------- NOTIFICATIONS COMPLETAS --------- */
    .populate({
      path: "notifications",
      populate: [
        { path: "fromUser", select: "username fullName avatar" },
        { path: "relatedSkill", select: "name skillKey" },
        { path: "relatedCombo", select: "name type totalPoints" },
        { path: "relatedTeam", select: "name avatar" },
      ],
    });

  if (!user) return null;

  /* =======================================================
     RECONSTRUCCIÓN MANUAL → ENTREGA TODO LISTO PARA EL FRONT
     ======================================================= */

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

    /* ------ NOTIFICACIONES ------ */
    notifications: user.notifications,
    notificationsCount: user.notificationsCount,

    /* ------ FAVORITOS ------ */
    favoriteSkills: user.favoriteSkills.map((fs) => ({
      userSkill: fs.userSkill,
      variantKey: fs.variantKey,
    })),
    favoriteCombos: user.favoriteCombos,

    /* ------ SKILLS CON VARIANTS MEZCLADAS ------ */
    skills: user.skills.map((us) => {
      const variants = us.variants.map((uv) => {
        const skillVariant = us.skill.variants.find(
          (v) => v.variantKey === uv.variantKey
        );

        return {
          ...uv.toObject(),
          name: skillVariant?.name || uv.variantKey,
          type: skillVariant?.type || "static",
          stats: skillVariant?.stats || {},
          staticAU: skillVariant?.staticAu || 0,
          dynamicAU: skillVariant?.dynamicAu || 0,
        };
      });

      return {
        _id: us._id,
        skill: us.skill,
        variants,
      };
    }),

    /* ------ COMBOS ------ */
    combos: user.combos.map((c) => ({
      _id: c._id,
      name: c.name,
      type: c.type,
      elements: c.elements,
      totalPoints: c.totalPoints,
      totalEnergyCost: c.totalEnergyCost,
    })),

    /* ------ MATCHES ------ */
    match: user.match,
  };
};
