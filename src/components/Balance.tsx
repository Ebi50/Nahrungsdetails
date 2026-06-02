'use client';

type Row = {
  key: string;
  label: string;
  unit: string;
  soll: number;
  ist: number;
  pct: number;
  band: 'low' | 'good' | 'over';
};

type BalanceData = {
  energy: { soll: number; ist: number; pct: number; burn: number } | null;
  nutrients: Row[];
};

const BAND_BAR: Record<Row['band'], string> = {
  low: 'bg-red-400',
  good: 'bg-green-500',
  over: 'bg-amber-400',
};

function Bar({ pct, band }: { pct: number; band: Row['band'] }) {
  return (
    <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
      <div className={`h-full ${BAND_BAR[band]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export function Balance({ data }: { data: BalanceData }) {
  return (
    <div className="space-y-4">
      {data.energy && (
        <div className="border rounded p-4 bg-white">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Energie</span>
            <span className="text-gray-600">
              {data.energy.ist} / {data.energy.soll} kcal ({data.energy.pct} %)
              {data.energy.burn > 0 && <span className="text-gray-400"> · −{data.energy.burn} verbrannt</span>}
            </span>
          </div>
          <Bar pct={data.energy.pct} band={data.energy.pct < 70 ? 'low' : data.energy.pct > 130 ? 'over' : 'good'} />
        </div>
      )}
      <div className="border rounded bg-white divide-y">
        {data.nutrients.map((r) => (
          <div key={r.key} className="p-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{r.label}</span>
              <span className="text-gray-600">
                {r.ist} / {r.soll} {r.unit} ({r.pct} %)
              </span>
            </div>
            <Bar pct={r.pct} band={r.band} />
          </div>
        ))}
      </div>
    </div>
  );
}
