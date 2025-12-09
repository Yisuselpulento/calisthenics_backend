import User from "../models/user.model.js";

export const updateUserAuraStats = async (userId) => {
  // Traemos el usuario con todas las skills y la info de cada skill
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
    const skill = userSkill.skill; // YA TRAES EL OBJETO COMPLETO
    if (!skill) continue; // Por seguridad, en caso de skill borrada

    for (const variant of userSkill.variants) {
      // Buscar la variante correspondiente en la skill original
      const skillVariant = skill.variants.find(v => v.variantKey === variant.variantKey);
      if (!skillVariant) continue;

      staticAura += skillVariant.staticAu;
      dynamicAura += skillVariant.dynamicAu;

      energy += (skillVariant.stats.energyPerRep || 0) + 
                (skillVariant.stats.energyPerSecond || 0);
    }
  }

  // Guardamos los stats actualizados
  user.stats.staticAura = staticAura;
  user.stats.dynamicAura = dynamicAura;
  user.stats.mainAura = staticAura + dynamicAura;
  user.stats.energy = energy;

  await user.save();
  return user;
};
