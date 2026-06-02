'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FoodSearch, Food } from '@/components/FoodSearch';
import { Balance } from '@/components/Balance';

type Entry = { id: string; grams: number; foods: { name: string; per_100g: Record<string, number> } | null };
type BalanceRow = {
  key: string; label: string; unit: string;
  soll: number; ist: number; pct: number; band: 'low' | 'good' | 'over';
};
type BalanceData = {
  energy: { soll: number; ist: number; pct: number; burn: number } | null;
  nutrients: BalanceRow[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DiaryPage() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [activity, setActivity] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const router = useRouter();
  const supabase = createClient();

  const reload = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push('/login'); return; }

    const [{ data: e }, { data: a }] = await Promise.all([
      supabase
        .from('diary_entries')
        .select('id, grams, foods(name, per_100g)')
        .eq('user_id', auth.user.id).eq('date', date),
      supabase
        .from('activity_entries')
        .select('kcal')
        .eq('user_id', auth.user.id).eq('date', date),
    ]);
    setEntries((e ?? []) as unknown as Entry[]);
    setActivity((a ?? []).reduce((s, r) => s + (r.kcal ?? 0), 0));

    const res = await fetch(`/api/balance?date=${date}`);
    if (res.ok) {
      setBalance(await res.json());
      setNote(null);
    } else {
      setBalance(null);
      const body = await res.json().catch(() => ({}));
      setNote(body.error ?? 'Bilanz nicht verfügbar.');
    }
  }, [date, router, supabase]);

  useEffect(() => { reload(); }, [reload]);

  function pickFood(food: Food) {
    setSelected(food);
    setGrams(100);
  }

  async function confirmAdd() {
    if (!selected) return;
    if (!Number.isFinite(grams) || grams <= 0) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from('diary_entries').insert({
      user_id: auth.user.id, date, food_id: selected.id, grams,
    });
    setSelected(null);
    reload();
  }

  async function removeEntry(id: string) {
    await supabase.from('diary_entries').delete().eq('id', id);
    reload();
  }

  async function saveActivity() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    // Tageswert als ein manueller Eintrag halten: vorhandene des Tages ersetzen.
    await supabase.from('activity_entries').delete()
      .eq('user_id', auth.user.id).eq('date', date).eq('source', 'manual');
    if (activity > 0) {
      await supabase.from('activity_entries').insert({
        user_id: auth.user.id, date, kcal: Math.round(activity), source: 'manual',
      });
    }
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tagebuch</h1>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-1.5 bg-white"
        />
      </div>

      <section>
        <FoodSearch onPick={pickFood} />
        {selected && (
          <div className="mt-3 border rounded p-3 bg-indigo-50 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-40">
              <div className="text-sm font-medium">{selected.name}</div>
              <div className="text-xs text-gray-500">
                {Math.round(selected.per_100g.kcal ?? 0)} kcal / 100 g · Quelle: {selected.source}
              </div>
            </div>
            <label className="block">
              <span className="text-xs text-gray-600">Menge (g)</span>
              <input
                type="number" min={1} step={5} value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="mt-1 border rounded px-3 py-2 bg-white w-28"
                autoFocus
              />
            </label>
            <button onClick={confirmAdd} className="bg-indigo-600 text-white rounded px-4 py-2">
              Hinzufügen
            </button>
            <button onClick={() => setSelected(null)} className="text-gray-500 px-2 py-2 text-sm">
              Abbrechen
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-600 mb-2">Einträge</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Einträge für diesen Tag.</p>
        ) : (
          <ul className="border rounded bg-white divide-y">
            {entries.map((en) => (
              <li key={en.id} className="px-3 py-2 flex justify-between items-center text-sm">
                <span>{en.foods?.name ?? '—'} · {en.grams} g
                  <span className="text-gray-400"> · {Math.round((en.foods?.per_100g.kcal ?? 0) * en.grams / 100)} kcal</span>
                </span>
                <button onClick={() => removeEntry(en.id)} className="text-red-500 hover:text-red-700">Entfernen</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex items-end gap-2">
        <label className="block">
          <span className="text-sm text-gray-600">Aktivitäts-Energie heute (kcal)</span>
          <input
            type="number" min={0} step={10} value={activity}
            onChange={(e) => setActivity(Number(e.target.value))}
            className="mt-1 border rounded px-3 py-2 bg-white w-40"
          />
        </label>
        <button onClick={saveActivity} className="bg-gray-800 text-white rounded px-4 py-2">Speichern</button>
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-600 mb-2">Bilanz</h2>
        {note && <p className="text-sm text-amber-600 mb-2">{note} <a href="/profile" className="underline">Profil anlegen</a></p>}
        {balance && <Balance data={balance} />}
      </section>
    </div>
  );
}
