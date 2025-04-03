import { DeclarationClass } from "@prisma/client";

export interface WeightAddition {
  id: string;
  name: string;
  weight: number;
  description?: string;
}

export const WEIGHT_ADDITIONS: Record<DeclarationClass, WeightAddition[]> = {
  GT4: [
    { id: "racing_abs", name: "Racing ABS", weight: 30 },
    { id: "racing_traction", name: "Racing traction control", weight: 25 },
    { id: "dsg_transmission", name: "DSG eller sekvensiell gearkasse", weight: 35 },
  ],
  GT3: [
    { id: "racing_abs", name: "Racing ABS", weight: 30 },
    { id: "racing_traction", name: "Racing traction control", weight: 40 },
    { id: "non_original_dsg", name: "Ikke original DSG", weight: 35 },
    { id: "pro_built_pre_2005", name: "Proff bygget -2005", weight: 40 },
    { id: "pro_built_2005_2008", name: "Proff bygget 2005-2008", weight: 60 },
    { id: "pro_built_2009_2012", name: "Proff bygget 2009-2012", weight: 70 },
    { id: "pro_built_2013_plus", name: "Proff bygget 2013-", weight: 80 },
  ],
  GT1: [
    { id: "pro_built", name: "Tillegsvekt proffbygd bil", weight: 50 },
    { id: "racing_abs", name: "Racing ABS", weight: 30 },
    { id: "racing_traction", name: "Racing traction control", weight: 25 },
    { id: "active_diff", name: "Aktive differensialer", weight: 50 },
    { id: "adjustable_aero", name: "Justerbar aero", weight: 50 },
    { id: "ceramic_brakes", name: "Keramiske bremser", weight: 50 },
  ],
  GT5: [],
  GT_PLUS: [],
  OTHER: [],
}; 