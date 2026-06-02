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
  const [en, setEn] = useState('');
  const [enVisible, setEnVisible] = useState(false);
  const [results, setResults] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch(term: string, source: 'both' | 'usda') {
    if (term.trim().length < 2) return;
    setBusy(true);
    setWarn(null);
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(term.trim())}&source=${source}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setWarn(data.warning ?? null);
      setSearched(true);
    } catch {
      setWarn('Suche fehlgeschlagen.');
      setResults([]);
      setSearched(true);
    } finally {
      setBusy(false);
    }
  }

  async function translateAndSearch() {
    if (q.trim().length < 2) return;
    setBusy(true);
    setWarn(null);
    try {
      const res = await fetch(`/api/translate?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      const term = data.text ?? q.trim();
      setEn(term);
      setEnVisible(true);
      await runSearch(term, 'usda');
    } catch {
      setWarn('Übersetzung fehlgeschlagen.');
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); runSearch(q, 'both'); }} className="flex gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Lebensmittel suchen (z. B. Dinkelflocken, Banane)…"
          className="flex-1 border rounded px-3 py-2 bg-white"
        />
        <button type="submit" disabled={busy} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">
          {busy ? '…' : 'Suchen'}
        </button>
      </form>

      <button
        type="button" onClick={translateAndSearch} disabled={busy}
        className="mt-2 text-sm text-indigo-600 disabled:opacity-50"
      >
        🇬🇧 ins Englische übersetzen & USDA durchsuchen (mehr Mikronährstoffe)
      </button>

      {enVisible && (
        <div className="mt-2 flex gap-2 items-center">
          <span className="text-sm text-gray-500">EN:</span>
          <input
            value={en} onChange={(e) => setEn(e.target.value)}
            className="flex-1 border rounded px-3 py-1.5 bg-white text-sm"
          />
          <button
            type="button" onClick={() => runSearch(en, 'usda')} disabled={busy}
            className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            USDA suchen
          </button>
        </div>
      )}

      {warn && <p className="mt-2 text-sm text-amber-600">{warn}</p>}

      {searched && results.length === 0 && !busy && (
        <p className="mt-3 text-sm text-gray-500">
          Keine Treffer. Tipp: anderen Begriff probieren oder „ins Englische übersetzen" für die USDA-Datenbank.
        </p>
      )}

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
