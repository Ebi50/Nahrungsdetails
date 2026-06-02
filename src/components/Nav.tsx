'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4 text-sm">
        <Link href="/" className="font-semibold">Nährstoff-Bilanz</Link>
        {email && (
          <>
            <Link href="/diary" className="text-gray-600 hover:text-gray-900">Tagebuch</Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">Profil</Link>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          {email ? (
            <>
              <span className="text-gray-500 hidden sm:inline">{email}</span>
              <button onClick={logout} className="text-gray-600 hover:text-gray-900">Abmelden</button>
            </>
          ) : (
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Anmelden</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
