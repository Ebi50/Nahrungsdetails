// Serverseitige Clients für externe Datenquellen (Abschnitt 4).
// API-Keys liegen ausschließlich hier (Server-Env), niemals im Browser.
import { normalizeOff, normalizeUsda } from './normalize';
import { Nutrients } from './nutrients';

export type ExternalFood = {
  source: 'usda' | 'off';
  source_ref: string;
  name: string;
  brand: string | null;
  per_100g: Nutrients;
};

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const OFF_BASE = 'https://world.openfoodfacts.org';

function usdaKey(): string {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error('USDA_API_KEY fehlt (Server-Env).');
  return key;
}

// USDA-Suche: unverarbeitete Grundnahrungsmittel bevorzugen.
export async function searchUsda(query: string, pageSize = 20): Promise<ExternalFood[]> {
  const url = new URL(`${USDA_BASE}/foods/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('dataType', 'Foundation,SR Legacy');
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('api_key', usdaKey());

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`USDA-Suche fehlgeschlagen: ${res.status}`);
  const data = (await res.json()) as { foods?: Array<Record<string, unknown>> };

  return (data.foods ?? []).map((f) => ({
    source: 'usda' as const,
    source_ref: String(f.fdcId),
    name: String(f.description ?? '').trim(),
    brand: (f.brandOwner as string) ?? null,
    per_100g: normalizeUsda(f as { foodNutrients?: never }),
  }));
}

// OFF-Barcode-Lookup (kein API-Key nötig).
export async function getOffProduct(barcode: string): Promise<ExternalFood | null> {
  const res = await fetch(`${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`, {
    headers: { 'User-Agent': 'Naehrstoffbilanz/1.0 (github.com/Ebi50/Nahrungsdetails)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`OFF-Lookup fehlgeschlagen: ${res.status}`);
  const data = (await res.json()) as {
    status?: number;
    product?: { product_name?: string; brands?: string; nutriments?: Record<string, number> };
  };
  if (data.status !== 1 || !data.product) return null;

  return {
    source: 'off',
    source_ref: barcode,
    name: (data.product.product_name ?? '').trim() || `Produkt ${barcode}`,
    brand: data.product.brands ?? null,
    per_100g: normalizeOff(data.product),
  };
}
