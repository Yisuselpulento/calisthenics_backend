export const calculateComboStats = (elements, userLabel = "Usuario") => {
  let totalPoints = 0;
  let totalEnergy = 0;

  elements.forEach((el, index) => {
    const { hold, reps, variantData } = el;
    const { pointsPerSecond, energyPerSecond, pointsPerRep, energyPerRep } = variantData.stats;

    // Determinar tipo de cálculo
    let elementPoints = 0;
    let elementEnergy = 0;

    if (reps > 0) {
      elementPoints = pointsPerRep * reps;
      elementEnergy = energyPerRep * reps;
    } else if (hold > 0) {
      elementPoints = pointsPerSecond * hold;
      elementEnergy = energyPerSecond * hold;
    } else {
      console.log("⚠️ Elemento sin reps ni hold, se ignora.");
    }

    totalPoints += elementPoints;
    totalEnergy += elementEnergy;
  });

  console.log("🟩 CÁLCULO FINALIZADO");
  console.log(`TOTAL POINTS: ${totalPoints}`);
  console.log(`TOTAL ENERGY: ${totalEnergy}\n`);

  return { totalPoints, totalEnergy };
};
