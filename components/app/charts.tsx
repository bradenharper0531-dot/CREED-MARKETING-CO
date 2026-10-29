/** Tiny dependency-free SVG charts in the Creed palette. */

export function Sparkline({ values, color = "var(--gold)", w = 110, h = 28 }: { values: number[]; color?: string; w?: number; h?: number }) {
  if (!values.length) return <span className="muted">—</span>;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`30-day trend, last day ${values[values.length - 1]}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Stacked weekly bars: fiber (gold) on top of pest (bronze). */
export function WeeklyBars({ weeks }: { weeks: { label: string; fiber: number; pest: number }[] }) {
  const W = 720, H = 240, pad = { l: 36, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...weeks.map((w) => w.fiber + w.pest));
  const nice = Math.ceil(max / 10) * 10 || 10;
  const bw = (W - pad.l - pad.r) / Math.max(1, weeks.length);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / nice);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Sales by week, fiber and pest control">
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line x1={pad.l} x2={W - pad.r} y1={y(nice * k)} y2={y(nice * k)} stroke="var(--line)" />
            <text x={pad.l - 6} y={y(nice * k) + 4} textAnchor="end" fill="var(--ink-muted)" fontSize="11" fontFamily="var(--mono)">{Math.round(nice * k)}</text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = pad.l + i * bw + bw * 0.18, bwid = bw * 0.64;
          return (
            <g key={w.label}>
              <rect x={x} y={y(w.pest)} width={bwid} height={y(0) - y(w.pest)} fill="var(--pest)" rx="2"><title>{`${w.label}: pest ${w.pest}`}</title></rect>
              <rect x={x} y={y(w.pest + w.fiber)} width={bwid} height={y(w.pest) - y(w.pest + w.fiber)} fill="var(--fiber)" rx="2"><title>{`${w.label}: fiber ${w.fiber}`}</title></rect>
              <text x={x + bwid / 2} y={H - 10} textAnchor="middle" fill="var(--ink-muted)" fontSize="11" fontFamily="var(--mono)">{w.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend"><span><i style={{ background: "var(--fiber)" }} />Fiber</span><span><i style={{ background: "var(--pest)" }} />Pest control</span></div>
    </div>
  );
}

const PILLAR_COLORS = { physical: "#f5c518", spiritual: "#f2ede1", mental: "#7ad19a", financial: "#c08a52" } as const;

/** Four-line trend of weekly pillar check-ins (1–10). */
export function PillarTrend({ rows }: { rows: { week: string; physical: number | null; spiritual: number | null; mental: number | null; financial: number | null }[] }) {
  if (rows.length < 2) return <p className="muted" style={{ fontSize: 14 }}>Your trend shows up after two weekly check-ins.</p>;
  const W = 520, H = 180, pad = { l: 24, r: 8, t: 8, b: 22 };
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (rows.length - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - 1) / 9);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Pillar check-in trend">
        {[1, 5, 10].map((v) => (
          <g key={v}><line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fill="var(--ink-muted)" fontSize="10" fontFamily="var(--mono)">{v}</text></g>
        ))}
        {(Object.keys(PILLAR_COLORS) as (keyof typeof PILLAR_COLORS)[]).map((k) => (
          <polyline key={k} fill="none" stroke={PILLAR_COLORS[k]} strokeWidth="2" strokeLinejoin="round"
            points={rows.map((r, i) => (r[k] == null ? null : `${x(i)},${y(r[k]!)}`)).filter(Boolean).join(" ")} />
        ))}
        {rows.map((r, i) => (i === 0 || i === rows.length - 1) && (
          <text key={r.week} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : "end"} fill="var(--ink-muted)" fontSize="10" fontFamily="var(--mono)">{r.week.slice(5)}</text>
        ))}
      </svg>
      <div className="legend">{(Object.keys(PILLAR_COLORS) as (keyof typeof PILLAR_COLORS)[]).map((k) => (
        <span key={k}><i style={{ background: PILLAR_COLORS[k] }} />{k[0].toUpperCase() + k.slice(1)}</span>
      ))}</div>
    </div>
  );
}

/** Simple daily bars for one rep's history. */
export function DailyBars({ days, color = "var(--gold)" }: { days: { day: string; sales: number }[]; color?: string }) {
  if (!days.length) return <p className="muted">No numbers logged yet.</p>;
  const W = 500, H = 120, max = Math.max(1, ...days.map((d) => d.sales));
  const bw = W / days.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" role="img" aria-label="Daily sales history">
      {days.map((d, i) => (
        <rect key={d.day} x={i * bw + 1} y={H - (d.sales / max) * H} width={Math.max(1, bw - 2)} height={(d.sales / max) * H} fill={color} rx="1"><title>{`${d.day}: ${d.sales}`}</title></rect>
      ))}
      <text x="0" y={H + 13} fill="var(--ink-muted)" fontSize="10" fontFamily="var(--mono)">{days[0].day.slice(5)}</text>
      <text x={W} y={H + 13} textAnchor="end" fill="var(--ink-muted)" fontSize="10" fontFamily="var(--mono)">{days[days.length - 1].day.slice(5)}</text>
    </svg>
  );
}
