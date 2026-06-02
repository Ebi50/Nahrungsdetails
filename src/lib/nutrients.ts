// Kanonisches Nährstoff-Schema (Abschnitt 5). Single Source of Truth.
// Alle Quellen (USDA/OFF/custom/mix) werden auf diese Schlüssel je 100 g abgebildet.

export const NUTRIENT_KEYS = [
  'kcal', 'protein', 'fat', 'carbs', 'fiber',
  'vitC', 'vitD', 'b12', 'folate',
  'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'sodium',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

// per_100g-Objekt: jeder Schlüssel optional (fehlend = nicht erfasst).
export type Nutrients = Partial<Record<NutrientKey, number>>;

type NutrientMeta = {
  key: NutrientKey;
  label: string;
  unit: 'kcal' | 'g' | 'mg' | 'µg';
  // 'limit' = Überschreitung ist das Problem (z. B. Natrium); sonst Zielgröße.
  kind: 'energy' | 'macro' | 'micro';
  limit?: boolean;
};

export const NUTRIENTS: Record<NutrientKey, NutrientMeta> = {
  kcal:      { key: 'kcal',      label: 'Energie',       unit: 'kcal', kind: 'energy' },
  protein:   { key: 'protein',   label: 'Protein',       unit: 'g',    kind: 'macro' },
  fat:       { key: 'fat',       label: 'Fett',          unit: 'g',    kind: 'macro' },
  carbs:     { key: 'carbs',     label: 'Kohlenhydrate', unit: 'g',    kind: 'macro' },
  fiber:     { key: 'fiber',     label: 'Ballaststoffe', unit: 'g',    kind: 'macro' },
  vitC:      { key: 'vitC',      label: 'Vitamin C',     unit: 'mg',   kind: 'micro' },
  vitD:      { key: 'vitD',      label: 'Vitamin D',     unit: 'µg',   kind: 'micro' },
  b12:       { key: 'b12',       label: 'Vitamin B12',   unit: 'µg',   kind: 'micro' },
  folate:    { key: 'folate',    label: 'Folat',         unit: 'µg',   kind: 'micro' },
  calcium:   { key: 'calcium',   label: 'Calcium',       unit: 'mg',   kind: 'micro' },
  iron:      { key: 'iron',      label: 'Eisen',         unit: 'mg',   kind: 'micro' },
  magnesium: { key: 'magnesium', label: 'Magnesium',     unit: 'mg',   kind: 'micro' },
  zinc:      { key: 'zinc',      label: 'Zink',          unit: 'mg',   kind: 'micro' },
  potassium: { key: 'potassium', label: 'Kalium',        unit: 'mg',   kind: 'micro' },
  sodium:    { key: 'sodium',    label: 'Natrium',       unit: 'mg',   kind: 'micro', limit: true },
};

// Summiert die Nährwerte einer Portion (grams) auf Basis der per_100g-Werte.
export function scale(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  const out: Nutrients = {};
  for (const key of NUTRIENT_KEYS) {
    const v = per100g[key];
    if (typeof v === 'number') out[key] = v * f;
  }
  return out;
}

// Addiert mehrere Nährstoff-Objekte (z. B. alle Tagebuch-Portionen).
export function sumNutrients(parts: Nutrients[]): Nutrients {
  const out: Nutrients = {};
  for (const part of parts) {
    for (const key of NUTRIENT_KEYS) {
      const v = part[key];
      if (typeof v === 'number') out[key] = (out[key] ?? 0) + v;
    }
  }
  return out;
}
