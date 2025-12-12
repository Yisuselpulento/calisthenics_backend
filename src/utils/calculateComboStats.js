export const calculateComboPointsStepByStep = (elements, userEnergy = 1000) => {
  let totalPoints = 0;
  const elementsStepData = [];

  // Parámetros del clean factor
  const minEnergy = 0;         // energía mínima posible
  const maxEnergy = 1000;      // energía máxima posible
  const minCleanFactor = 0.8;  // -20% si energía mínima
  const maxCleanFactor = 1.2;  // +20% si energía máxima

  // Normalizar energía a factor de limpieza
  const normalizeCleanFactor = (energy) => {
    const factor =
      minCleanFactor +
      ((energy - minEnergy) / (maxEnergy - minEnergy)) *
        (maxCleanFactor - minCleanFactor);
    return factor;
  };

  const cleanFactor = normalizeCleanFactor(userEnergy);

  elements.forEach((el) => {
    const { hold, reps, variantData, fingers } = el;
    const { pointsPerSecond, pointsPerRep } = variantData.stats;

    // 1️⃣ Puntos base
    let basePoints = 0;
    if (reps > 0) basePoints = pointsPerRep * reps;
    else if (hold > 0) basePoints = pointsPerSecond * hold;

    // 2️⃣ Bonus por fingers
    let fingersFactor = 1;
    if (fingers === 2) fingersFactor = 1.2;
    else if (fingers === 1) fingersFactor = 1.5;
    const pointsWithFingers = basePoints * fingersFactor;

    // 3️⃣ Bonus / penalización por limpieza según energía
    const pointsWithCleanHit = pointsWithFingers * cleanFactor;

    // 4️⃣ Acumular total
    totalPoints += pointsWithCleanHit;

    // 5️⃣ Registrar detalle paso a paso
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
    elementsStepData,
  };
};
