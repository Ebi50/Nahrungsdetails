import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getOffProduct } from '@/lib/sources';

// GET /api/foods/barcode/{code} — OFF-Lookup mit Caching.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: 'Ungültiger Barcode.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) Cache prüfen.
  const { data: hit } = await admin
    .from('foods')
    .select('id, source, source_ref, name, brand, per_100g')
    .eq('source', 'off')
    .eq('source_ref', code)
    .is('owner_id', null)
    .maybeSingle();
  if (hit) return NextResponse.json({ result: hit });

  // 2) OFF abfragen.
  let product;
  try {
    product = await getOffProduct(code);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'OFF nicht erreichbar.' },
      { status: 502 },
    );
  }
  if (!product) {
    return NextResponse.json({ error: 'Produkt nicht gefunden.' }, { status: 404 });
  }

  // 3) Cachen und zurückgeben.
  const { data: saved } = await admin
    .from('foods')
    .upsert(
      {
        owner_id: null,
        source: product.source,
        source_ref: product.source_ref,
        name: product.name,
        brand: product.brand,
        per_100g: product.per_100g,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source,source_ref' },
    )
    .select('id, source, source_ref, name, brand, per_100g')
    .single();

  return NextResponse.json({ result: saved });
}
