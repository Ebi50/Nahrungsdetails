'use client';
import { useState } from 'react';

export type Food = {
  id: string;
  source: string;
  name: string;
  brand: string | null;
  per_100g: Record<string, number>;
};

export function FoodSearch({ onPick }: { onPick: (food: Food) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setWarn(null);
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
      if (data.warning) setWarn(data.warning);
    } catch {
      setWarn('Suche fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Lebensmittel suchen (z. B. oats, banana)…"
          className="flex-1 border rounded px-3 py-2 bg-white"
        />
        <button type="submit" disabled={busy} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">
          {busy ? '…' : 'Suchen'}
        </button>
      </form>
      {warn && <p className="mt-2 text-sm text-amber-600">{warn}</p>}
      {results.length > 0 && (
        <ul className="mt-3 border rounded divide-y bg-white max-h-72 overflow-auto">
          {results.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => onPick(f)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between gap-2"
              >
                <span>
                  {f.name}
                  {f.brand && <span className="text-gray-400"> · {f.brand}</span>}
                </span>
                <span className="text-gray-400 text-sm shrink-0">
                  {Math.round(f.per_100g.kcal ?? 0)} kcal · {f.source}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
