import UserSkill from "../models/userSkill.model.js";

export const populateComboWithFingers = async (combo) => {
  const elementsWithFingers = await Promise.all(
    combo.elements.map(async (el) => {
      // Buscar la variante correspondiente en UserSkill
      const userSkill = await UserSkill.findOne(
        { "variants._id": el.userSkillVariantId },
        { "variants.$": 1 } // traer solo la variante que necesitamos
      ).lean();

      let fingers = 5; // valor por defecto
      if (userSkill?.variants?.length > 0) {
        fingers = userSkill.variants[0].fingers;
      }

      return {
        ...el.toObject(), // todo lo que ya tenía el elemento
        fingers,          // agregar solo fingers
      };
    })
  );

  return {
    ...combo.toObject(),
    elements: elementsWithFingers,
  };
};
