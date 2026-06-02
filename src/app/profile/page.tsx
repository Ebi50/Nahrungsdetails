'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Form = {
  sex: 'm' | 'f';
  age: number;
  weight_kg: number;
  height_cm: number;
  pal: number;
  goal_kcal: number;
  protein_per_kg: number;
};

const EMPTY: Form = { sex: 'm', age: 30, weight_kg: 70, height_cm: 175, pal: 1.4, goal_kcal: 0, protein_per_kg: 0.8 };

export default function ProfilePage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push('/login'); return; }
      const { data } = await supabase.from('profiles').select('*').eq('user_id', auth.user.id).maybeSingle();
      if (data) setForm({ ...EMPTY, ...data });
      setReady(true);
    })();
  }, [router, supabase]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push('/login'); return; }
    const { error } = await supabase.from('profiles').upsert({
      user_id: auth.user.id,
      ...form,
      updated_at: new Date().toISOString(),
    });
    setMsg(error ? error.message : 'Gespeichert.');
  }

  if (!ready) return <p className="text-gray-500">Lädt…</p>;

  const num = (k: keyof Form, label: string, step = '1', extra: Record<string, unknown> = {}) => (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="number" step={step} value={form[k] as number}
        onChange={(e) => set(k, Number(e.target.value) as never)}
        className="mt-1 w-full border rounded px-3 py-2 bg-white" {...extra}
      />
    </label>
  );

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Profil</h1>
      <form onSubmit={save} className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-gray-600">Geschlecht</span>
          <select
            value={form.sex} onChange={(e) => set('sex', e.target.value as 'm' | 'f')}
            className="mt-1 w-full border rounded px-3 py-2 bg-white"
          >
            <option value="m">männlich</option>
            <option value="f">weiblich</option>
          </select>
        </label>
        {num('age', 'Alter (Jahre)')}
        {num('weight_kg', 'Gewicht (kg)', '0.1')}
        {num('height_cm', 'Größe (cm)', '0.1')}
        {num('pal', 'PAL (Aktivität 1,2–2,0)', '0.05')}
        {num('protein_per_kg', 'Protein (g/kg)', '0.1')}
        {num('goal_kcal', 'Ziel-kcal (0 / −500 / +)', '50')}
        <div className="col-span-2 flex items-center gap-3">
          <button type="submit" className="bg-indigo-600 text-white rounded px-4 py-2">Speichern</button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
