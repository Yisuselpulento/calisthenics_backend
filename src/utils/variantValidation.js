export const validateVariantProgression = (skill, userSkill, variantKey) => {
  // Buscar variante base por variantKey
  const baseVariant = skill.variants.find(v => v.variantKey === variantKey);
  if (!baseVariant) {
    return {
      valid: false,
      message: "La variante no existe en la Skill original"
    };
  }

  const incomingProgLevel = baseVariant.progressionLevel;

  // Progreso máximo actual del usuario (basado solo en progressionLevel)
  const maxUserProg = userSkill?.variants?.reduce((max, v) => {
    const matched = skill.variants.find(sv => sv.variantKey === v.variantKey);
    return matched?.progressionLevel > max ? matched.progressionLevel : max;
  }, 0) || 0;

  if (incomingProgLevel < maxUserProg) {
    return {
      valid: false,
      message: "No puedes seleccionar una variante de progresión menor a la que ya tienes"
    };
  }

  return { valid: true, progressionLevel: incomingProgLevel };
};
