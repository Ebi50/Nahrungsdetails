import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { searchUsda, searchOff, ExternalFood } from '@/lib/sources';

// GET /api/foods/search?q=...&source=usda|off|both|cache
// Strategie: eigener foods-Cache + externe Quellen (USDA englisch, OFF mehrsprachig).
// USDA findet generische Grundnahrungsmittel; OFF kennt deutsche Begriffe/Marken.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Suchbegriff zu kurz (min. 2 Zeichen).' }, { status: 400 });
  }
  const source = req.nextUrl.searchParams.get('source') ?? 'both';

  const supabase = await createClient();

  // 1) Eigener Cache (geteilte usda/off + eigene custom-Einträge) per Namenssuche.
  const { data: cached } = await supabase
    .from('foods')
    .select('id, source, source_ref, name, brand, per_100g')
    .ilike('name', `%${q}%`)
    .limit(20);

  if (source === 'cache') {
    return NextResponse.json({ results: cached ?? [] });
  }

  // 2) Externe Quellen parallel abfragen; Ausfälle einzeln tolerieren.
  const wantUsda = source === 'usda' || source === 'both';
  const wantOff = source === 'off' || source === 'both';
  const warnings: string[] = [];

  const [usdaRes, offRes] = await Promise.allSettled([
    wantUsda ? searchUsda(q) : Promise.resolve<ExternalFood[]>([]),
    wantOff ? searchOff(q) : Promise.resolve<ExternalFood[]>([]),
  ]);

  const external: ExternalFood[] = [];
  if (usdaRes.status === 'fulfilled') external.push(...usdaRes.value);
  else warnings.push(usdaRes.reason instanceof Error ? usdaRes.reason.message : 'USDA nicht erreichbar.');
  if (offRes.status === 'fulfilled') external.push(...offRes.value);
  else warnings.push(offRes.reason instanceof Error ? offRes.reason.message : 'Open Food Facts nicht erreichbar.');

  // 3) Externe Treffer in den globalen Cache schreiben (owner_id null).
  const admin = createAdminClient();
  if (external.length > 0) {
    const rows = external.map((f) => ({
      owner_id: null,
      source: f.source,
      source_ref: f.source_ref,
      name: f.name,
      brand: f.brand,
      per_100g: f.per_100g,
      updated_at: new Date().toISOString(),
    }));
    const { error: upsertErr } = await admin
      .from('foods')
      .upsert(rows, { onConflict: 'source,source_ref' });
    if (upsertErr) warnings.push(`Cache-Schreiben fehlgeschlagen: ${upsertErr.message}`);
  }

  // 4) Cache erneut lesen, damit die IDs der frischen Einträge zurückkommen.
  const merged = new Map<string, unknown>();
  for (const r of cached ?? []) merged.set((r as { id: string }).id, r);

  if (external.length > 0) {
    const refs = external.map((f) => f.source_ref);
    const { data: fresh } = await admin
      .from('foods')
      .select('id, source, source_ref, name, brand, per_100g')
      .in('source_ref', refs)
      .is('owner_id', null);
    for (const r of fresh ?? []) merged.set((r as { id: string }).id, r);
  }

  return NextResponse.json({
    results: Array.from(merged.values()),
    ...(warnings.length ? { warning: warnings.join(' ') } : {}),
  });
}
