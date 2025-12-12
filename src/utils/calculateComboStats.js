export const calculateComboPointsStepByStep = (elements, userEnergy = 1000) => {
  let totalPoints = 0;
  const elementsStepData = [];

  elements.forEach((el) => {
    const { hold, reps, variantData, fingers } = el;
    const { pointsPerSecond, pointsPerRep } = variantData.stats;

    // Paso 1️⃣: puntos base
    let basePoints = 0;
    if (reps > 0) basePoints = pointsPerRep * reps;
    else if (hold > 0) basePoints = pointsPerSecond * hold;

    // Paso 2️⃣: bonus por fingers
    let fingersFactor = 1;
    if (fingers === 2) fingersFactor = 1.2;
    else if (fingers === 1) fingersFactor = 1.5;
    const pointsWithFingers = basePoints * fingersFactor;

    // Paso 3️⃣: bonus por limpieza según energía
    const cleanFactor = 1 + (userEnergy / 1000) * 0.1; // hasta +10%
    const pointsWithCleanHit = pointsWithFingers * cleanFactor;

    // Paso 4️⃣: acumular total
    totalPoints += pointsWithCleanHit;

    // Paso 5️⃣: registrar detalle paso a paso
    elementsStepData.push({
      elementId: el.userSkillVariantId,
      name: variantData.name,
      hold,
      reps,
      fingers,
      basePoints,
      pointsWithFingers,
      cleanFactor,
      pointsWithCleanHit,
      totalPointsSoFar: totalPoints,
    });
  });

  return {
    totalPoints,
    energy: userEnergy,
    elementsStepData, // esto se puede usar en frontend para animación
  };
};
