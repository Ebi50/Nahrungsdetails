import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildTargets, buildBalance, Profile, ReferenceValue } from '@/lib/calc';
import { scale, sumNutrients, Nutrients } from '@/lib/nutrients';

// GET /api/balance?date=YYYY-MM-DD — fertige Soll/Ist-Bilanz des Tages.
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date=YYYY-MM-DD erforderlich.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const [{ data: profile }, { data: refs }, { data: diary }, { data: activity }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', auth.user.id).maybeSingle(),
      supabase.from('reference_values').select('sex, age_min, age_max, nutrient_key, value'),
      supabase
        .from('diary_entries')
        .select('grams, foods(per_100g)')
        .eq('user_id', auth.user.id)
        .eq('date', date),
      supabase
        .from('activity_entries')
        .select('kcal')
        .eq('user_id', auth.user.id)
        .eq('date', date),
    ]);

  if (!profile) {
    return NextResponse.json({ error: 'Kein Profil angelegt.' }, { status: 409 });
  }

  const activityKcal = (activity ?? []).reduce((s, a) => s + (a.kcal ?? 0), 0);

  // Ist-Zufuhr: jede Portion skalieren und summieren.
  const parts: Nutrients[] = (diary ?? []).map((d) => {
    const food = d.foods as unknown as { per_100g: Nutrients } | null;
    return food ? scale(food.per_100g, d.grams) : {};
  });
  const intake = sumNutrients(parts);

  const targets = buildTargets(
    profile as Profile,
    (refs ?? []) as ReferenceValue[],
    activityKcal,
  );
  const rows = buildBalance(targets, intake);

  const energy = rows.find((r) => r.key === 'kcal');
  return NextResponse.json({
    date,
    energy: energy
      ? { soll: energy.soll, ist: energy.ist, pct: energy.pct, burn: activityKcal }
      : null,
    nutrients: rows.filter((r) => r.key !== 'kcal'),
  });
}
