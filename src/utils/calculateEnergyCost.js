import UserSkill from "../models/userSkill.model.js";
import Skill from "../models/skill.model.js";

export const calculateEnergyCost = async (elements) => {
  let totalEnergy = 0;

  for (const el of elements) {
    // 1. Obtener el UserSkill
    const userSkill = await UserSkill.findById(el.userSkill).lean();
    if (!userSkill) throw new Error("UserSkill no encontrado");

    // 2. Obtener la Skill base
    const baseSkill = await Skill.findById(userSkill.skill).lean();
    if (!baseSkill) throw new Error("Skill no encontrada");

    // 3. Encontrar la variante correcta
    const variant = baseSkill.variants.find(v => v.variantKey === el.variantKey);
    if (!variant)
      throw new Error(`Variante '${el.variantKey}' no encontrada en Skill base`);

    // 4. Calcular energía correctamente según tu esquema real
    if (variant.type === "static") {
      totalEnergy += (variant.stats.energyPerSecond || 0) * el.hold;
    } else {
      totalEnergy += (variant.stats.energyPerRep || 0) * el.hold;
    }
  }

  return totalEnergy;
};
