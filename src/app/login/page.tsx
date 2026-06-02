'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fn =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    if (mode === 'signup') {
      setMsg('Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte Postfach prüfen.');
      return;
    }
    router.push('/diary');
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="text-xl font-semibold mb-4">
        {mode === 'login' ? 'Anmelden' : 'Registrieren'}
      </h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email" required placeholder="E-Mail" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 bg-white"
        />
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'} required minLength={6} placeholder="Passwort" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 pr-16 bg-white"
          />
          <button
            type="button" onClick={() => setShowPw((s) => !s)}
            className="absolute inset-y-0 right-0 px-3 text-sm text-indigo-600"
          >
            {showPw ? 'verbergen' : 'zeigen'}
          </button>
        </div>
        <button
          type="submit" disabled={busy}
          className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50"
        >
          {busy ? '…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
      <button
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}
        className="mt-4 text-sm text-indigo-600"
      >
        {mode === 'login' ? 'Neues Konto erstellen' : 'Schon registriert? Anmelden'}
      </button>
    </div>
  );
}
