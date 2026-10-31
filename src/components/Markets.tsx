import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Reveal } from './Reveal.tsx';
import { MARKET_CARDS, type Industry } from '../data/markets.ts';
import { trackSpotlight } from '../lib/spotlight.ts';

type Filter = 'all' | Industry;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fiber', label: 'Fiber' },
  { id: 'pest', label: 'Pest control' },
  { id: 'starlink', label: 'Starlink' },
];

const INDUSTRY_TAG: Record<Industry, { label: string; className: string }> = {
  fiber: { label: 'FIBER', className: 'text-gold bg-gold-soft' },
  pest: { label: 'PEST', className: 'text-bronze bg-[#2a1d12]' },
  starlink: { label: 'STARLINK', className: 'text-ink-muted bg-surface-raised' },
};

export function Markets() {
  const [filter, setFilter] = useState<Filter>('all');
  const list = filter === 'all' ? MARKET_CARDS : MARKET_CARDS.filter((m) => m.industry === filter);
  const count = (id: Filter) => (id === 'all' ? MARKET_CARDS.length : MARKET_CARDS.filter((m) => m.industry === id).length);

  return (
    <section id="markets" className="w-full bg-[#080807] border-t border-line py-24 sm:py-32 px-6 sm:px-10 lg:px-16 text-ink">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-gold-soft text-gold font-mono text-eyebrow font-medium uppercase mb-5">
            <MapPin className="w-3 h-3" />
            Markets
          </div>
          <h2 className="font-display text-display-xs sm:text-display-sm font-semibold text-ink">
            Pick your market.
          </h2>
          <p className="mt-5 text-lede text-ink-muted">
            Every market, its leads, its connect rate and what a rep earns per account. Missing numbers show a dash until they're confirmed.
          </p>
        </Reveal>

        {/* Filter chips */}
        <Reveal className="mb-8">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter markets by industry">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                    active ? 'border-gold-deep bg-gold-soft text-gold' : 'border-line text-ink-muted hover:text-ink hover:border-ink-muted'
                  }`}
                >
                  {f.label}
                  <span className="font-mono text-xs opacity-70 tabular">{count(f.id)}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {list.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line p-10 text-center text-ink-muted">
            Pest control markets are posted soon. Apply now and tell us you're interested.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {list.map((m, i) => {
              const tag = INDUSTRY_TAG[m.industry];
              return (
                <Reveal key={m.name} delay={(i % 3) * 80}>
                  <article
                    onPointerMove={trackSpotlight}
                    className="spotlight h-full rounded-[10px] border border-line bg-surface p-6 hover:border-gold-deep transition-colors duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-2xl font-semibold tracking-[0.04em] text-ink">{m.name}</h3>
                      <span className={`mt-1 shrink-0 rounded-[4px] px-2 py-0.5 font-mono text-[11px] tracking-[0.04em] ${tag.className}`}>
                        {tag.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{m.provider ?? 'Provider —'}</p>

                    <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
                      {[
                        ['Leads', m.leads],
                        ['Connect', m.connect],
                        ['Rep pay / acct', m.pay],
                      ].map(([k, v]) => (
                        <div key={k} className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">{k}</dt>
                          <dd className="mt-1 font-mono text-sm text-gold-glow break-words tabular">{v ?? '—'}</dd>
                        </div>
                      ))}
                    </dl>

                    {m.pace && (
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted mr-1">Pace</span>
                        {m.pace.map((p) => (
                          <span key={p} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink">{p}</span>
                        ))}
                      </div>
                    )}
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
