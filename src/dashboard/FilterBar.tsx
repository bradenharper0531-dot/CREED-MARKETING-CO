import React from 'react';
import { RANGES } from './dates.ts';
import type { Filters } from './repData.ts';
import type { MarketRow } from './types.ts';
import { ChipButton } from './ui.tsx';

/* Industry · Market · Date range. Kept in memory per page. */
export function FilterBar({ value, onChange, markets, showRange = true }: { value: Filters; onChange: (f: Filters) => void; markets: MarketRow[]; showRange?: boolean }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {([['all', 'All'], ['fiber', 'Fiber'], ['pest', 'Pest control']] as const).map(([id, l]) => (
        <ChipButton key={id} on={value.industry === id} onClick={() => set('industry', id)}>{l}</ChipButton>
      ))}
      <span className="mx-1 h-6 w-px bg-line" />
      <select
        aria-label="Market"
        value={value.market}
        onChange={(e) => set('market', e.target.value)}
        className={`rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm font-semibold ${value.market === 'all' ? 'text-ink-muted' : 'text-gold'}`}
      >
        <option value="all">All markets</option>
        {markets.filter((m) => m.industry !== 'starlink').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {showRange && (
        <>
          <span className="mx-1 h-6 w-px bg-line" />
          {RANGES.map((r) => (
            <ChipButton key={r.id} on={value.range === r.id} onClick={() => set('range', r.id)}>{r.label}</ChipButton>
          ))}
        </>
      )}
    </div>
  );
}
