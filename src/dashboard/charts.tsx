import React from 'react';

/* Tiny dependency-free SVG charts in the Creed palette. */

export function Sparkline({ values, color = '#f5c518', w = 110, h = 28 }: { values: number[]; color?: string; w?: number; h?: number }) {
  if (!values.length) return <span className="text-ink-muted">—</span>;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`30-day trend, last day ${values[values.length - 1]}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* Stacked weekly bars: fiber (gold) on top of pest control (bronze). */
export function WeeklyBars({ weeks }: { weeks: { label: string; fiber: number; pest: number }[] }) {
  const W = 720, H = 240, l = 36, r = 8, t = 12, b = 28;
  const max = Math.max(1, ...weeks.map((w) => w.fiber + w.pest));
  const nice = Math.ceil(max / 10) * 10 || 10;
  const bw = (W - l - r) / Math.max(1, weeks.length);
  const y = (v: number) => t + (H - t - b) * (1 - v / nice);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Sales by week, fiber and pest control">
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line x1={l} x2={W - r} y1={y(nice * k)} y2={y(nice * k)} stroke="#2e2a22" />
            <text x={l - 6} y={y(nice * k) + 4} textAnchor="end" fill="#9a927f" fontSize="11" fontFamily="JetBrains Mono, monospace">{Math.round(nice * k)}</text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = l + i * bw + bw * 0.18, bwid = bw * 0.64;
          return (
            <g key={w.label}>
              <rect x={x} y={y(w.pest)} width={bwid} height={y(0) - y(w.pest)} fill="#c08a52" rx="2"><title>{`${w.label}: pest ${w.pest}`}</title></rect>
              <rect x={x} y={y(w.pest + w.fiber)} width={bwid} height={y(w.pest) - y(w.pest + w.fiber)} fill="#f5c518" rx="2"><title>{`${w.label}: fiber ${w.fiber}`}</title></rect>
              <text x={x + bwid / 2} y={H - 10} textAnchor="middle" fill="#9a927f" fontSize="11" fontFamily="JetBrains Mono, monospace">{w.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-gold" />Fiber</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-bronze" />Pest control</span>
      </div>
    </div>
  );
}

export function DailyBars({ days, color = '#f5c518' }: { days: { day: string; sales: number }[]; color?: string }) {
  if (!days.length) return <p className="text-sm text-ink-muted">No numbers logged yet.</p>;
  const W = 500, H = 110, max = Math.max(1, ...days.map((d) => d.sales));
  const bw = W / days.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" role="img" aria-label="Daily sales history">
      {days.map((d, i) => (
        <rect key={d.day} x={i * bw + 1} y={H - (d.sales / max) * H} width={Math.max(1, bw - 2)} height={(d.sales / max) * H} fill={color} rx="1">
          <title>{`${d.day}: ${d.sales}`}</title>
        </rect>
      ))}
      <text x="0" y={H + 13} fill="#9a927f" fontSize="10" fontFamily="JetBrains Mono, monospace">{days[0].day.slice(5)}</text>
      <text x={W} y={H + 13} textAnchor="end" fill="#9a927f" fontSize="10" fontFamily="JetBrains Mono, monospace">{days[days.length - 1].day.slice(5)}</text>
    </svg>
  );
}
