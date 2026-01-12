export const calculateComboPointsStepByStep = (elements, userEnergy = 1000) => {
  let totalPoints = 0;
  const elementsStepData = [];

  const maxEnergy = 1000;
  const minCleanFactor = 0.8;
  const maxCleanFactor = 1.2;

  const getRandomCleanFactor = (energy) => {
    const energyRatio = Math.min(Math.max(energy / maxEnergy, 0), 1);
    const min = minCleanFactor + energyRatio * (1 - minCleanFactor);
    const max = minCleanFactor + energyRatio * (maxCleanFactor - minCleanFactor);
    return min + Math.random() * (max - min);
  };

  elements.forEach((el) => {
    const { hold, reps, variantData, fingers } = el;
    const { pointsPerSecond, pointsPerRep } = variantData.stats;

    let basePoints = 0;
    if (reps > 0) basePoints = pointsPerRep * reps;
    else if (hold > 0) basePoints = pointsPerSecond * hold;

    let fingersFactor = 1;
    if (fingers === 2) fingersFactor = 1.2;
    else if (fingers === 1) fingersFactor = 1.5;

    const pointsWithFingers = basePoints * fingersFactor;
    const cleanFactor = getRandomCleanFactor(userEnergy);
    const pointsWithCleanHit = pointsWithFingers * cleanFactor;

    totalPoints += pointsWithCleanHit;

    elementsStepData.push({
      elementId: el.userSkillVariantId,
      name: variantData.name,
      hold,
      reps,
      fingers,
      basePoints: Math.ceil(basePoints),
      pointsWithFingers: Math.ceil(pointsWithFingers),
      cleanFactor,
      pointsWithCleanHit: Math.ceil(pointsWithCleanHit),
      totalPointsSoFar: Math.ceil(totalPoints),
    });
  });

  return {
    totalPoints: Math.ceil(totalPoints),
    elementsStepData,
  };
};