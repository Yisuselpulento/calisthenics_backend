import User from "../models/user.model.js";

export const getAuthUser = (userId) => {
  return User.findById(userId)
    .select(
      "_id username fullName email videoProfile avatar gender isAdmin isVerified profileType country altura peso notificationsCount ranking followers following favoriteCombos"
    )
     .populate({
      path: "favoriteCombos.static",
      select: "name type fingers energyPerSecond energyPerRep",
    })
    .populate({
      path: "favoriteCombos.dynamic",
      select: "name type fingers energyPerSecond energyPerRep",
    })
    .populate({
      path: "notifications",
      select:
        "type message read createdAt fromUser relatedSkill relatedCombo relatedTeam",
      options: { sort: { createdAt: -1 }, limit: 5 },
      populate: { path: "fromUser", select: "username fullName avatar" },
    })
    .populate({
      path: "followers",
      select: "username fullName avatar",
      options: { limit: 10 },
    })
    .populate({
      path: "following",
      select: "username fullName avatar",
      options: { limit: 10 },
    });
};