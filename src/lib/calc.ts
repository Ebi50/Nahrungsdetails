// Berechnungslogik (Abschnitt 7): Soll-Bedarf, Ist-Zufuhr, Bilanz.
import { NUTRIENTS, NutrientKey, Nutrients } from './nutrients';

export type Profile = {
  sex: 'm' | 'f';
  age: number;
  weight_kg: number;
  height_cm: number;
  pal: number;
  goal_kcal: number;
  protein_per_kg: number;
};

export type ReferenceValue = {
  sex: 'm' | 'f' | 'any';
  age_min: number;
  age_max: number;
  nutrient_key: string;
  value: number;
};

// Grundumsatz nach Mifflin-St-Jeor.
export function bmr(p: Profile): number {
  const s = p.sex === 'm' ? 5 : -161;
  return 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + s;
}

// Energiebedarf = BMR · PAL + Tagesaktivität(kcal) + Ziel(kcal).
// activityKcal ist vom PAL entkoppelt (genauer bei viel Sport).
export function energyTarget(p: Profile, activityKcal: number): number {
  return Math.round(bmr(p) * p.pal + activityKcal + p.goal_kcal);
}

// Makro-Ziele in Gramm.
export function macroTargets(p: Profile, energyKcal: number) {
  const protein = p.weight_kg * Math.max(p.protein_per_kg, 0.8);
  const fat = (0.30 * energyKcal) / 9;
  const carbs = Math.max(0, (energyKcal - protein * 4 - fat * 9) / 4);
  return { protein, fat, carbs, fiber: 30 };
}

// Mikro-Ziele aus den Referenzwerten nach Geschlecht/Alter.
function pickReference(
  refs: ReferenceValue[],
  key: NutrientKey,
  p: Profile,
): number | undefined {
  const match = refs.find(
    (r) =>
      r.nutrient_key === key &&
      (r.sex === p.sex || r.sex === 'any') &&
      p.age >= r.age_min &&
      p.age <= r.age_max,
  );
  return match?.value;
}

export type TargetMap = Partial<Record<NutrientKey, number>>;

// Komplettes Soll je Nährstoff.
export function buildTargets(
  p: Profile,
  refs: ReferenceValue[],
  activityKcal: number,
): TargetMap {
  const energy = energyTarget(p, activityKcal);
  const macros = macroTargets(p, energy);
  const targets: TargetMap = {
    kcal: energy,
    protein: macros.protein,
    fat: macros.fat,
    carbs: macros.carbs,
    fiber: macros.fiber,
  };
  for (const key of ['vitC','vitD','b12','folate','calcium','iron','magnesium','zinc','potassium','sodium'] as NutrientKey[]) {
    const v = pickReference(refs, key, p);
    if (v !== undefined) targets[key] = v;
  }
  return targets;
}

export type Band = 'low' | 'good' | 'over';

// Farbband: Standard <70 % low, 70–130 % good, >130 % over.
// Für Limit-Nährstoffe (Natrium) ist Überschreitung das Problem -> >100 % = over.
export function band(key: NutrientKey, pct: number): Band {
  if (NUTRIENTS[key].limit) {
    return pct > 100 ? 'over' : 'good';
  }
  if (pct < 70) return 'low';
  if (pct > 130) return 'over';
  return 'good';
}

export type BalanceRow = {
  key: NutrientKey;
  label: string;
  unit: string;
  soll: number;
  ist: number;
  pct: number;
  band: Band;
};

// Bilanz: Ist (Summe der Tagebuch-Portionen) gegen Soll, je Nährstoff.
export function buildBalance(targets: TargetMap, intake: Nutrients): BalanceRow[] {
  return (Object.keys(targets) as NutrientKey[]).map((key) => {
    const soll = targets[key]!;
    const ist = intake[key] ?? 0;
    const pct = soll > 0 ? Math.round((ist / soll) * 100) : 0;
    return {
      key,
      label: NUTRIENTS[key].label,
      unit: NUTRIENTS[key].unit,
      soll: Math.round(soll * 10) / 10,
      ist: Math.round(ist * 10) / 10,
      pct,
      band: band(key, pct),
    };
  });
}
