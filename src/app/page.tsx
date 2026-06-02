import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-3">Nährstoff-Bilanz</h1>
      <p className="text-gray-600 mb-6">
        Stelle Deinen täglichen Bedarf (Soll) der tatsächlichen Zufuhr (Ist) gegenüber —
        für Energie, Makro- und Mikronährstoffe. Lebensmittel kommen aus USDA & Open Food Facts.
      </p>
      <div className="flex gap-3">
        <Link href="/diary" className="bg-indigo-600 text-white rounded px-4 py-2">Zum Tagebuch</Link>
        <Link href="/profile" className="border rounded px-4 py-2">Profil</Link>
      </div>
      <p className="mt-8 text-xs text-gray-400">
        Orientierungswerte, keine medizinische Beratung.
      </p>
    </div>
  );
}
