export const calculateComboPointsStepByStep = (elements, userEnergy = 1000) => {
  let totalPoints = 0;
  const elementsStepData = [];

  const minEnergy = 0;       // energía mínima posible
  const maxEnergy = 1000;    // energía máxima posible
  const minCleanFactor = 0.8; // factor mínimo (penalización)
  const maxCleanFactor = 1.2; // factor máximo (bonificación)

  // Función que devuelve un cleanFactor aleatorio por elemento según la energía
  const getRandomCleanFactor = (energy) => {
    // Normalizamos energía a un rango 0-1
    const energyRatio = Math.min(Math.max(energy / maxEnergy, 0), 1);

    // Determinar rango de limpieza para este elemento
    const elementMin = minCleanFactor + (energyRatio * (1 - minCleanFactor)); // aumenta mínimo con energía
    const elementMax = minCleanFactor + (energyRatio * (maxCleanFactor - minCleanFactor)); // aumenta máximo con energía

    // Número aleatorio entre elementMin y elementMax
    return elementMin + Math.random() * (elementMax - elementMin);
  };

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

    // 3️⃣ Clean factor aleatorio por elemento
    const cleanFactor = getRandomCleanFactor(userEnergy);
    const pointsWithCleanHit = pointsWithFingers * cleanFactor;

    // 4️⃣ Acumular total
    totalPoints += pointsWithCleanHit;

    // 5️⃣ Registrar detalle
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
