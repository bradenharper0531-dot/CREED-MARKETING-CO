import React, { useEffect, useState } from 'react';
import { Calculator as CalcIcon, Lock, Eye } from 'lucide-react';
import { Reveal } from './Reveal.tsx';
import { CALC_MARKETS } from '../data/markets.ts';
import { rules, projector, money, num, autoDaysLeft } from '../lib/payPlan.ts';
import { labelClass, numFieldClass, tableClass, numCell, bigCell } from '../lib/ui.ts';
import { useOwnerRates } from '../lib/ownerRates.ts';

type Field = 'pace' | 'days' | 'weeks' | 'yearWeeks' | 'prior' | 'daysLeft' | 'reps' | 'override' | 'repPace' | 'repDays';
type State = { mi: number; rb: boolean } & Record<Field, string>;

const KEY = 'creed_rep_v1';

const DEF: State = {
  mi: 0,
  rb: false,
  pace: String(CALC_MARKETS[0].pace),
  days: '6',
  weeks: '14',
  yearWeeks: '40',
  prior: '0',
  daysLeft: '0',
  reps: '5',
  override: '25',
  repPace: '1.5',
  repDays: '6',
};

/* Inputs persist per browser; "work days left" is always refilled from today's date. */
function load(): State {
  let s: State = { ...DEF };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...DEF, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable — use defaults */
  }
  if (!(s.mi >= 0 && s.mi < CALC_MARKETS.length)) s.mi = 0;
  s.daysLeft = String(autoDaysLeft(parseFloat(s.days) || 0));
  return s;
}

const B = ({ children }: { children: React.ReactNode }) => <b className="font-medium text-gold-glow">{children}</b>;

function Box({ tag, title, full, children }: { tag: string; title: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-[10px] border border-line bg-surface ${full ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-baseline gap-2.5 border-b border-line px-4 pt-3.5 pb-2.5">
        <span className="whitespace-nowrap rounded-[4px] bg-gold-soft px-[7px] py-0.5 font-mono text-[11px] tracking-[0.04em] text-gold">{tag}</span>
        <h3 className="font-display text-xl font-semibold tracking-[0.04em] text-ink">{title}</h3>
      </div>
      <div className="grid gap-3.5 px-4 pt-3.5 pb-4">{children}</div>
    </div>
  );
}

function Out({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5 rounded-lg border border-line bg-well p-3.5 text-[#f5efe0]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gold-dim">{label}</div>
      {children}
    </div>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-ink-muted [&_b]:font-medium [&_b]:text-ink">{children}</span>
);

export function Calculator() {
  const [S, setS] = useState<State>(load);
  const { isOwner, rates } = useOwnerRates();
  const [view, setView] = useState<'owner' | 'rep'>('owner');

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch {
      /* storage unavailable */
    }
  }, [S]);

  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setS((s) => ({ ...s, [f]: value }));
  };
  const n = (f: Field) => Math.max(0, parseFloat(S[f]) || 0);

  /* ---- Personal revenue ---- */
  const m = CALC_MARKETS[S.mi];
  const ir = m.connect / 100;
  /* Owners see full contract pay; everyone else (and owners in "Rep view") sees rep pay */
  const full = rates[m.name];
  const ownerView = isOwner && view === 'owner' && !!full;
  const R = ownerView ? rules(full, ir) : rules(m, ir, S.rb ? 25 : 0);
  const pace = n('pace');
  const days = n('days');
  const weeks = n('weeks');
  const yearWeeks = n('yearWeeks');
  const prior = n('prior');
  const dl = n('daysLeft');
  const wdm = (days * 52) / 12;
  const project = projector(R, prior, dl, wdm);
  const fullMonth = pace * wdm;

  const rows = [
    { l: 'Day', ...project(pace, 1) },
    { l: 'Week', ...project(pace, days) },
    { l: `Rest of this month (${num(dl, 0)} days)`, ...project(pace, dl) },
    { l: 'Full month (starts at 0)', pay: R.payAt(fullMonth), sold: fullMonth, rate: R.rateAt(fullMonth) },
    { l: `Season (${num(weeks, 0)} wks)`, ...project(pace, days * weeks) },
    { l: `Year (${num(yearWeeks, 0)} wks)`, ...project(pace, days * yearWeeks) },
  ];

  const unit = R.basis === 'installed' ? 'installs' : 'sales';
  const curRate = R.rateAt(prior);
  const toNext = R.step - (R.counted(prior) % R.step);
  const flat = R.base >= R.cap;
  const rateLabel = flat ? money(R.cap) : `${money(R.base)} → ${money(R.cap)}`;
  const label = (r: { base: number; cap: number }) => (r.base >= r.cap ? money(r.cap) : `${money(r.base)} → ${money(r.cap)}`);
  const repRateLabel = label(m);

  /* ---- Recruiting overrides ---- */
  const reps = n('reps');
  const override = n('override');
  const repPace = n('repPace');
  const repDays = n('repDays');
  const repWeekInst = repPace * ir * repDays;
  const teamWeek = repWeekInst * reps;
  const ovRows: [string, number][] = [
    ['Week', teamWeek],
    ['Month', (teamWeek * 52) / 12],
    [`Season (${num(weeks, 0)} wks)`, teamWeek * weeks],
    [`Year (${num(yearWeeks, 0)} wks)`, teamWeek * yearWeeks],
  ];
  const sizes = [1, 3, 5, 10, 15, 20, 30];
  if (reps && !sizes.includes(reps)) sizes.push(reps);
  sizes.sort((a, b) => a - b);

  const pS = rows[4].pay;
  const pY = rows[5].pay;
  const oS = teamWeek * weeks * override;
  const oY = teamWeek * yearWeeks * override;

  const pickMarket = (i: number) => setS((s) => ({ ...s, mi: i, pace: String(CALC_MARKETS[i].pace) }));

  const summary = [
    { k: 'Personal / season', v: money(pS) },
    { k: 'Override / season', v: money(oS) },
    { k: 'Personal / year', v: money(pY) },
    { k: 'Combined / year', v: money(pY + oY), hero: true },
  ];

  const field = (f: Field, label: string, opts: { step?: string; max?: string; hint?: string } = {}) => (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={`calc-${f}`} className="text-sm font-semibold text-ink">{label}</label>
      <input
        id={`calc-${f}`}
        type="number"
        min="0"
        max={opts.max}
        step={opts.step ?? '1'}
        inputMode="decimal"
        value={S[f]}
        onChange={set(f)}
        className={numFieldClass}
      />
      {opts.hint && <small className="text-xs text-ink-muted">{opts.hint}</small>}
    </div>
  );

  return (
    <section id="calculator" className="w-full bg-bg border-t border-line py-24 sm:py-32 px-6 sm:px-10 lg:px-16 text-ink">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-gold-soft text-gold font-mono text-eyebrow font-medium uppercase mb-5">
            <CalcIcon className="w-3 h-3" />
            The Money
          </div>
          <h2 className="font-display text-display-xs sm:text-display-sm font-semibold text-ink">
            Run your numbers.
          </h2>
          <p className="mt-5 text-lede text-ink-muted">
            Pick a market to load its numbers, then enter your pace and schedule. Every figure sits next to the inputs that produce it — the money is the result of the other three pillars.
          </p>
        </Reveal>

        <Reveal>
          <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-2">
            {isOwner && (
              <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
                <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="Plan view">
                  {(['owner', 'rep'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${view === v ? 'bg-gold text-on-gold' : 'text-ink-muted hover:text-ink'}`}
                    >
                      {v === 'owner' ? 'Owner view' : 'Rep view'}
                    </button>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <Eye className="h-4 w-4 text-gold" />
                  {view === 'owner'
                    ? full ? 'Full contract pay and your spread — only owners can see this.' : `No full rate on file for ${m.name} yet — showing rep pay.`
                    : 'Exactly what reps see.'}
                </span>
              </div>
            )}

            {/* Summary tiles */}
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:col-span-2">
              {summary.map((s) => (
                <div key={s.k} className="grid min-w-0 gap-0.5 rounded-lg border border-line bg-well px-3.5 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gold-dim">{s.k}</span>
                  <span className={`font-mono text-gold-glow tabular break-words ${s.hero ? 'text-[26px]' : 'text-[22px]'}`}>{s.v}</span>
                </div>
              ))}
            </div>

            {/* MARKET */}
            <Box tag="MARKET" title="Choose a Market" full>
              <div className="grid gap-1">
                <label htmlFor="calc-market" className="text-sm font-semibold text-ink">Market</label>
                <select
                  id="calc-market"
                  value={S.mi}
                  onChange={(e) => pickMarket(+e.target.value)}
                  className="w-full rounded-md border border-gold bg-bg px-3 py-2.5 font-display text-lg uppercase tracking-[0.03em] text-gold focus:outline-2 focus:outline-offset-1 focus:outline-gold"
                >
                  {CALC_MARKETS.map((mk, i) => (
                    <option key={mk.name} value={i}>{mk.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                {[
                  ['Leads', m.leads ?? '—'],
                  ['Connect rate', m.connectLabel || '—'],
                  [ownerView ? 'Full pay / account' : 'Pay per account', rateLabel],
                  ['Provider', m.provider ?? '—'],
                  ...(ownerView ? [['Rep pay / account', repRateLabel]] : []),
                ].map(([k, val]) => (
                  <div key={k} className="grid min-w-0 gap-0.5 rounded-lg border border-line bg-bg px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
                      {k}
                      <Lock className="h-3 w-3 text-gold-dim" aria-label="Locked preset" />
                    </span>
                    <span className="font-mono text-base text-gold-glow break-words">{val}</span>
                  </div>
                ))}
              </div>
            </Box>

            {/* INPUTS */}
            <Box tag="INPUTS" title="Your Numbers" full>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                {field('pace', 'Sales per day', { step: '0.5', hint: 'Your expected pace' })}
                {field('days', 'Days worked / week', { max: '7' })}
                {field('weeks', 'Weeks in season', { max: '52' })}
                {field('yearWeeks', 'Weeks worked / year', { max: '52' })}
                {field('prior', 'Sold so far this month', { hint: "Counts toward this month's tier" })}
                {field('daysLeft', 'Work days left this month', { max: '31', hint: "Filled from today's date" })}
              </div>

              {!ownerView && <label htmlFor="calc-rb" className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line px-3 py-2.5 hover:border-gold-deep transition-colors">
                <input
                  id="calc-rb"
                  type="checkbox"
                  checked={S.rb}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setS((s) => ({ ...s, rb: checked }));
                  }}
                  className="mt-0.5 h-[18px] w-[18px] flex-none accent-gold"
                />
                <span className="text-sm">I've brought on 2–3 friends who are signed and working <b className="text-gold-glow">(+$25 base pay)</b></span>
              </label>}

              {m.paceTiers && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`${labelClass} mb-0 mr-1`}>{m.name} benchmarks:</span>
                  {m.paceTiers.map((t) => (
                    <button
                      key={t.l}
                      type="button"
                      onClick={() => setS((s) => ({ ...s, pace: String(t.v) }))}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:border-gold hover:text-gold transition-colors cursor-pointer"
                    >
                      {t.l}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Chip>Installs/day <b>{num(pace * ir, 2)}</b></Chip>
                <Chip>Value per door sale today <b>{money(curRate * ir)}</b></Chip>
              </div>
            </Box>

            {/* OUTPUT 1 — PERSONAL REVENUE */}
            <Box tag="OUTPUT 1" title="Projected Personal Revenue">
              <div className="flex flex-wrap gap-2">
                {flat ? (
                  <Chip>Rate <b>{money(R.cap)}</b> per account</Chip>
                ) : (
                  <>
                    <Chip>This month's rate <b>{money(curRate)}</b>/acct</Chip>
                    {curRate >= R.cap ? (
                      <Chip>Max rate reached</Chip>
                    ) : (
                      <Chip>Next raise in <b>{num(toNext, 0)}</b> {unit} → <b>{money(Math.min(R.cap, curRate + R.bump))}</b></Chip>
                    )}
                    <Chip>Full-month rate at your pace <b>{money(R.rateAt(fullMonth))}</b></Chip>
                    <Chip>Resets to <b>{money(R.base)}</b> on the 1st</Chip>
                  </>
                )}
              </div>

              <Out label={flat ? 'This month' : 'Raises pay back every account this month'}>
                <table className={tableClass}>
                  <tbody>
                    {[prior, rows[2].sold].map((sold, i) => (
                      <tr key={i}>
                        <td>{i ? 'End of month' : 'Right now'}: {flat ? '' : 'all '}{num(sold, 0)} sold × {m.connect}% × {money(R.rateAt(sold))}</td>
                        <td className={`${numCell} ${bigCell}`}>{money(R.payAt(sold))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Out>

              <Out label="Calculation">
                <p className="font-mono text-xs leading-relaxed text-gold-dim break-words">
                  {flat ? (
                    <><B>{num(pace, 2)}</B> sales/day × <B>{m.connect}%</B> connect × <B>{money(R.cap)}</B> per account. A month = <B>{num(wdm, 1)}</B> work days.</>
                  ) : (
                    <>Rate starts at <B>{money(R.base)}</B> and goes up <B>{money(R.bump)}</B> for every <B>{num(R.step, 0)}</B> {unit} in the month, up to <B>{money(R.cap)}</B>. The raise applies to every account sold that month, and resets on the 1st. <B>{num(pace, 2)}</B> sales/day × <B>{m.connect}%</B> connect; a month = <B>{num(wdm, 1)}</B> work days.</>
                  )}
                </p>
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead>
                      <tr><th>Through</th><th className={numCell}>Sold</th><th className={numCell}>Rate</th><th className={numCell}>Total pay</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.l}>
                          <td>{r.l}</td>
                          <td className={numCell}>{num(r.sold, 0)}</td>
                          <td className={numCell}>{money(r.rate)}</td>
                          <td className={`${numCell} ${i >= 4 ? bigCell : ''}`}>{money(r.pay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Out>
            </Box>

            {/* OUTPUT 2 — RECRUITING OVERRIDES */}
            <Box tag="OUTPUT 2" title="Recruiting Overrides">
              <div className="grid grid-cols-2 gap-3">
                {field('reps', 'Number of reps')}
                {field('override', 'Override per install', { step: '5', hint: 'Dollars' })}
                {field('repPace', 'Rep sales / day', { step: '0.5', hint: 'Newer reps often sell less' })}
                {field('repDays', 'Rep days / week', { max: '7' })}
              </div>

              <div className="rounded-lg border border-dashed border-gold px-3 py-2.5 text-sm text-gold">
                <b>Recruiting bonus:</b> bring on 2–3 friends, and as soon as they're signed and working, your base pay goes up $25 per account automatically.
              </div>

              <Out label="Calculation">
                <p className="font-mono text-xs leading-relaxed text-gold-dim break-words">
                  <B>{num(reps, 0)}</B> reps × <B>{num(repPace, 2)}</B> sales/day × <B>{m.connect}%</B> × <B>{num(repDays, 0)}</B> days × <B>{money(override)}</B> = <B>{money(teamWeek * override)}</B>/week
                </p>
                <table className={tableClass}>
                  <thead>
                    <tr><th>Period</th><th className={numCell}>Team installs</th><th className={numCell}>Your override</th></tr>
                  </thead>
                  <tbody>
                    {ovRows.map(([l, inst], i) => (
                      <tr key={l}>
                        <td>{l}</td>
                        <td className={numCell}>{num(inst, 1)}</td>
                        <td className={`${numCell} ${i >= 2 ? bigCell : ''}`}>{money(inst * override)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Out>

              <Out label="Override by team size (per season)">
                <table className={tableClass}>
                  <tbody>
                    {sizes.map((size) => (
                      <tr key={size} className={size === reps ? 'text-gold-glow' : ''}>
                        <td>{size} rep{size > 1 ? 's' : ''}{size === reps ? ' (current)' : ''}</td>
                        <td className={numCell}>{money(repWeekInst * size * weeks * override)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Out>

              <Out label="Personal + override total">
                <table className={tableClass}>
                  <tbody>
                    <tr><td>Season: personal {money(pS)} + override {money(oS)}</td><td className={`${numCell} ${bigCell}`}>{money(pS + oS)}</td></tr>
                    <tr><td>Year: personal {money(pY)} + override {money(oY)}</td><td className={`${numCell} ${bigCell}`}>{money(pY + oY)}</td></tr>
                  </tbody>
                </table>
              </Out>
            </Box>

            {ownerView && <OwnerSpread rates={rates} mi={S.mi} repPace={repPace} repDays={repDays} weeks={weeks} reps={reps} />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* Owners only: full contract pay vs. rep pay — per account in every market,
   and per rep / across the team in the selected market. Same engine as above. */
function OwnerSpread({ rates, mi, repPace, repDays, weeks, reps }: {
  rates: Record<string, import('../lib/payPlan.ts').PayRule>; mi: number; repPace: number; repDays: number; weeks: number; reps: number;
}) {
  const m = CALC_MARKETS[mi];
  const ir = m.connect / 100;
  const label = (r: { base: number; cap: number }) => (r.base >= r.cap ? money(r.cap) : `${money(r.base)} → ${money(r.cap)}`);
  const F = rules(rates[m.name], ir);
  const P = rules(m, ir);
  const wdm = (repDays * 52) / 12;
  const rd = repDays * weeks;
  const fullPay = projector(F, 0, 0, wdm)(repPace, rd).pay;
  const repPay = projector(P, 0, 0, wdm)(repPace, rd).pay;
  return (
    <Box tag="OWNERS" title="Full Pay vs. Rep Pay" full>
      <span className="w-fit rounded-[4px] bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-on-gold">Owners only · do not share with reps</span>
      <Out label="Per account, every market">
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr><th>Market</th><th className={numCell}>Full pay</th><th className={numCell}>Rep pay</th><th className={numCell}>Spread at start</th><th className={numCell}>Spread at max</th></tr>
            </thead>
            <tbody>
              {CALC_MARKETS.filter((mk) => rates[mk.name]).map((mk) => {
                const f = rates[mk.name];
                return (
                  <tr key={mk.name} className={mk.name === m.name ? 'text-gold-glow' : ''}>
                    <td>{mk.name}</td>
                    <td className={numCell}>{label(f)}</td>
                    <td className={numCell}>{label(mk)}</td>
                    <td className={numCell}>{money(f.base - mk.base)}</td>
                    <td className={numCell}>{money(f.cap - mk.cap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Out>
      <Out label="Spread in the selected market (per season)">
        <p className="font-mono text-xs leading-relaxed text-gold-dim break-words">
          {m.name}: <B>{num(repPace, 2)}</B> sales/day × <B>{num(repDays, 0)}</B> days × <B>{num(weeks, 0)}</B> wks × <B>{m.connect}%</B>, paid month by month at full rates vs. rep rates. Uses the rep inputs in Recruiting Overrides.
        </p>
        <table className={tableClass}>
          <tbody>
            <tr><td>Full pay on one rep&apos;s season</td><td className={numCell}>{money(fullPay)}</td></tr>
            <tr><td>Rep is paid</td><td className={numCell}>{money(repPay)}</td></tr>
            <tr><td>Spread per rep</td><td className={`${numCell} ${bigCell}`}>{money(fullPay - repPay)}</td></tr>
            <tr><td>Spread across {num(reps, 0)} reps</td><td className={`${numCell} ${bigCell}`}>{money((fullPay - repPay) * reps)}</td></tr>
          </tbody>
        </table>
      </Out>
    </Box>
  );
}
