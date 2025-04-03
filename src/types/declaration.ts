export type DeclarationClassType = 
  | "GT 1"
  | "GT 3"
  | "GT 4"
  | "GT 5"
  | "GT+"
  | "Historisk klasse 10"
  | "Norsk ClubSport"
  | "Shortcar/Seven/RSR"
  | "Historisk klasse 8 og 9"
  | "DS3 Cup"
  | "Egendefinert klasse";

export interface ClassLimits {
  ratio: number;
  maxPower: number;
  turboRatio?: number;
}

export const DeclarationClass = {
  GT1: "GT 1",
  GT3: "GT 3",
  GT4: "GT 4",
  GT5: "GT 5",
  GT_PLUS: "GT+",
  HISTORISK_10: "Historisk klasse 10",
  NORSK_CLUBSPORT: "Norsk ClubSport",
  SHORTCAR_SEVEN_RSR: "Shortcar/Seven/RSR",
  HISTORISK_8_9: "Historisk klasse 8 og 9",
  DS3_CUP: "DS3 Cup",
  CUSTOM: "Egendefinert klasse",
} as const;

export const CLASS_LIMITS: Record<DeclarationClassType, ClassLimits> = {
  "GT 1": { ratio: 2.5, maxPower: 800 },
  "GT 3": { ratio: 3.7, maxPower: 420, turboRatio: 3.2 },
  "GT 4": { ratio: 4.9, maxPower: 250, turboRatio: 4.2 },
  "GT 5": { ratio: 7.3, maxPower: 160 },
  "GT+": { ratio: 1.0, maxPower: 1500 },
  "Historisk klasse 10": { ratio: 7.3, maxPower: 160 },
  "Norsk ClubSport": { ratio: 7.3, maxPower: 160 },
  "Shortcar/Seven/RSR": { ratio: 7.3, maxPower: 160 },
  "Historisk klasse 8 og 9": { ratio: 7.3, maxPower: 160 },
  "DS3 Cup": { ratio: 7.3, maxPower: 160 },
  "Egendefinert klasse": { ratio: 7.3, maxPower: 160 },
}; 