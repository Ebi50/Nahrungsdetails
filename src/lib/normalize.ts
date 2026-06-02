// Normalisierung externer Quellen auf das kanonische Schema je 100 g (Abschnitt 5).
import { NutrientKey, Nutrients } from './nutrients';

// --- USDA FoodData Central -------------------------------------------------
// Zuordnung NutrientKey -> USDA nutrientNumber (String).
const USDA_NUMBER: Record<NutrientKey, string> = {
  kcal: '208', protein: '203', fat: '204', carbs: '205', fiber: '291',
  vitC: '401', vitD: '328', b12: '418', folate: '417',
  calcium: '301', iron: '303', magnesium: '304', zinc: '309',
  potassium: '306', sodium: '307',
};

type UsdaNutrient = {
  nutrientNumber?: string;          // Suchergebnis (abridged)
  value?: number;
  amount?: number;                  // Detail-Antwort
  nutrient?: { number?: string };   // Detail-Antwort
};

export function normalizeUsda(food: { foodNutrients?: UsdaNutrient[] }): Nutrients {
  const byNumber = new Map<string, number>();
  for (const n of food.foodNutrients ?? []) {
    const num = n.nutrientNumber ?? n.nutrient?.number;
    const val = n.value ?? n.amount;
    if (num && typeof val === 'number') byNumber.set(num, val);
  }
  const out: Nutrients = {};
  for (const key of Object.keys(USDA_NUMBER) as NutrientKey[]) {
    const v = byNumber.get(USDA_NUMBER[key]);
    if (typeof v === 'number') out[key] = v; // USDA-Werte bereits je 100 g in Zielunit
  }
  return out;
}

// --- Open Food Facts -------------------------------------------------------
// OFF-_100g-Werte sind in Gramm (außer Energie). Umrechnung in Zielunits.
type OffNutriments = Record<string, number | string | undefined>;

function num(n: OffNutriments, ...fields: string[]): number | undefined {
  for (const f of fields) {
    const v = n[f];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

export function normalizeOff(product: { nutriments?: OffNutriments }): Nutrients {
  const n = product.nutriments ?? {};
  const out: Nutrients = {};

  const kcal = num(n, 'energy-kcal_100g');
  if (kcal !== undefined) out.kcal = kcal;

  // Makros: bereits in Gramm
  for (const [key, field] of [
    ['protein', 'proteins_100g'],
    ['fat', 'fat_100g'],
    ['carbs', 'carbohydrates_100g'],
    ['fiber', 'fiber_100g'],
  ] as [NutrientKey, string][]) {
    const v = num(n, field);
    if (v !== undefined) out[key] = v;
  }

  // Vitamine: g -> Zielunit
  const gToMg = 1_000;
  const gToUg = 1_000_000;
  const setScaled = (key: NutrientKey, factor: number, ...fields: string[]) => {
    const v = num(n, ...fields);
    if (v !== undefined) out[key] = v * factor;
  };

  setScaled('vitC', gToMg, 'vitamin-c_100g');
  setScaled('vitD', gToUg, 'vitamin-d_100g');
  setScaled('b12', gToUg, 'vitamin-b12_100g');
  setScaled('folate', gToUg, 'folates_100g', 'vitamin-b9_100g');
  setScaled('calcium', gToMg, 'calcium_100g');
  setScaled('iron', gToMg, 'iron_100g');
  setScaled('magnesium', gToMg, 'magnesium_100g');
  setScaled('zinc', gToMg, 'zinc_100g');
  setScaled('potassium', gToMg, 'potassium_100g');

  // Natrium: direkt, sonst aus Salz (natrium = salz / 2,5).
  const sodiumG = num(n, 'sodium_100g');
  if (sodiumG !== undefined) {
    out.sodium = sodiumG * gToMg;
  } else {
    const saltG = num(n, 'salt_100g');
    if (saltG !== undefined) out.sodium = (saltG / 2.5) * gToMg;
  }

  return out;
}
