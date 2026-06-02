import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { searchUsda, ExternalFood } from '@/lib/sources';

// GET /api/foods/search?q=...&source=usda|cache
// Strategie: zuerst eigener foods-Cache, dann USDA; USDA-Treffer werden gecacht.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Suchbegriff zu kurz (min. 2 Zeichen).' }, { status: 400 });
  }
  const source = req.nextUrl.searchParams.get('source') ?? 'usda';

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

  // 2) USDA abfragen.
  let external: ExternalFood[] = [];
  try {
    external = await searchUsda(q);
  } catch (e) {
    // Bei USDA-Ausfall wenigstens Cache zurückgeben.
    return NextResponse.json({
      results: cached ?? [],
      warning: e instanceof Error ? e.message : 'USDA nicht erreichbar.',
    });
  }

  // 3) USDA-Treffer in den globalen Cache schreiben (owner_id null).
  const admin = createAdminClient();
  const rows = external.map((f) => ({
    owner_id: null,
    source: f.source,
    source_ref: f.source_ref,
    name: f.name,
    brand: f.brand,
    per_100g: f.per_100g,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length > 0) {
    await admin.from('foods').upsert(rows, { onConflict: 'source,source_ref' });
  }

  // 4) Cache erneut lesen, damit IDs der frischen Einträge zurückkommen.
  const refs = external.map((f) => f.source_ref);
  const { data: fresh } = await admin
    .from('foods')
    .select('id, source, source_ref, name, brand, per_100g')
    .in('source_ref', refs)
    .eq('source', 'usda');

  // Cache-Namens-Treffer + USDA-Treffer zusammenführen, nach id deduplizieren.
  const merged = new Map<string, unknown>();
  for (const r of cached ?? []) merged.set((r as { id: string }).id, r);
  for (const r of fresh ?? []) merged.set((r as { id: string }).id, r);

  return NextResponse.json({ results: Array.from(merged.values()) });
}
