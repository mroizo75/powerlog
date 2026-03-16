import { DeclarationClass } from "@prisma/client";

export type ClassLimit = {
  ratio: number;
  maxPower: number;
  turboRatio?: number;
};

export const CLASS_LIMITS: Record<DeclarationClass, ClassLimit> = {
  GT5: { ratio: 7.3, maxPower: 160 },
  GT4: { ratio: 4.9, maxPower: 250, turboRatio: 5.5 },
  GT3: { ratio: 3.7, maxPower: 420, turboRatio: 4.0 },
  GT1: { ratio: 2.5, maxPower: 800 },
  GT_PLUS: { ratio: 1.0, maxPower: 1500 },
  OTHER: { ratio: 0, maxPower: 0 },
};

export const getRequiredRatio = (declaredClass: DeclarationClass, isTurbo: boolean) => {
  const classLimit = CLASS_LIMITS[declaredClass];
  if (!classLimit) {
    return 0;
  }

  if (isTurbo && typeof classLimit.turboRatio === "number") {
    return classLimit.turboRatio;
  }

  return classLimit.ratio;
};
