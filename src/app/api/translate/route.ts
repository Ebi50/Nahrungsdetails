import { NextRequest, NextResponse } from 'next/server';

// Override-Wörterbuch: Begriffe, die Übersetzer bei Lebensmitteln oft verhauen.
// Kleingeschrieben; vollständige Phrase zuerst, dann einzelne Wörter.
const OVERRIDES: Record<string, string> = {
  'dinkelflocken': 'spelt flakes',
  'dinkel': 'spelt',
  'haferflocken': 'rolled oats',
  'hafer': 'oats',
  'magerquark': 'low fat quark',
  'quark': 'quark',
  'speisequark': 'quark',
  'vollkornbrot': 'whole grain bread',
  'roggenbrot': 'rye bread',
  'hähnchenbrust': 'chicken breast',
  'hühnerbrust': 'chicken breast',
  'rinderhack': 'ground beef',
  'putenbrust': 'turkey breast',
  'lachs': 'salmon',
  'thunfisch': 'tuna',
  'rührei': 'scrambled eggs',
  'spiegelei': 'fried egg',
  'kichererbsen': 'chickpeas',
  'linsen': 'lentils',
  'walnüsse': 'walnuts',
  'haselnüsse': 'hazelnuts',
  'leinsamen': 'flaxseed',
  'chiasamen': 'chia seeds',
};

async function viaMyMemory(text: string): Promise<string | null> {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'de|en');
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const t = data.responseData?.translatedText?.trim();
    return t && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

// GET /api/translate?q=...  (immer DE->EN)
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'q erforderlich.' }, { status: 400 });

  const key = q.toLowerCase();
  if (OVERRIDES[key]) {
    return NextResponse.json({ text: OVERRIDES[key], source: 'dictionary' });
  }

  const translated = await viaMyMemory(q);
  if (!translated) {
    // Fallback: Originalbegriff zurückgeben, damit die Suche trotzdem weiterläuft.
    return NextResponse.json({ text: q, source: 'fallback', warning: 'Übersetzung nicht verfügbar.' });
  }
  return NextResponse.json({ text: translated, source: 'mymemory' });
}
