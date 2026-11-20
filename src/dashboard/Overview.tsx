import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { money } from '../lib/payPlan.ts';
import { PageHead } from './Dashboard.tsx';
import { FilterBar } from './FilterBar.tsx';
import { buildRows, DEFAULT_FILTERS, useRepData, type Filters } from './repData.ts';
import { addDays, rangeBounds, weekStart, ymd } from './dates.ts';
import { WeeklyBars } from './charts.tsx';
import { STAGES, stageTone, type Stage } from './types.ts';
import { Card, Delta, ErrorNote, IndTag, Loading, Pill, SampleTag, Stat } from './ui.tsx';
import { DASH, TRACK } from '../lib/route.ts';
import { closeRate, objectionLabel, sumDoors, type DoorCount } from '../lib/doors.ts';

const OVERRIDE_PER_INSTALL = 25; // matches the calculator default

type RecruitLite = { stage: Stage; created_at: string; signed_at: string | null; next_follow_up: string | null };

/* The group at a glance. Owners see everyone. A team lead (team=true) sees only the
   reps under them; the database returns nothing else to them anyway. No override money. */
export function Overview({ team = false }: { team?: boolean }) {
  const { reps, markets, stats, error } = useRepData();
  const [f, setF] = useState<Filters>(DEFAULT_FILTERS);
  const [recruits, setRecruits] = useState<RecruitLite[]>([]);
  const [doorRows, setDoorRows] = useState<DoorCount[]>([]);
  const [otherWords, setOtherWords] = useState<{ rep_id: string; day: string; objection: string }[]>([]);

  useEffect(() => {
    supabase?.from('recruits').select('stage, created_at, signed_at, next_follow_up').then(({ data }) => setRecruits((data as RecruitLite[]) ?? []));
    // reps' door tracker taps, one row per rep per day (the database only returns the reps this person may see)
    supabase?.from('door_counts').select('rep_id, day, doors, objections, sales, objection_mix').gte('day', ymd(addDays(new Date(), -200))).limit(20000)
      .then(({ data }) => setDoorRows((data as DoorCount[]) ?? []));
    supabase?.from('door_other_objections').select('rep_id, day, objection').gte('day', ymd(addDays(new Date(), -200))).limit(5000)
      .then(({ data }) => setOtherWords((data as { rep_id: string; day: string; objection: string }[]) ?? []));
  }, []);

  if (!reps) return <Loading />;

  const rows = buildRows(reps, markets, stats, f);
  const b = rangeBounds(f.range);
  const ids = new Set(rows.map((r) => r.id));
  const within = (from: string, to: string) => stats.filter((s) => ids.has(s.rep_id) && s.day >= from && s.day <= to);
  const total = (a: typeof stats, k: 'sales' | 'installs') => a.reduce((t, x) => t + x[k], 0);
  const cur = within(b.start, b.end), prev = within(b.prevStart, b.prevEnd);
  const sales = total(cur, 'sales'), installs = total(cur, 'installs');
  const pSales = total(prev, 'sales'), pInstalls = total(prev, 'installs');
  const connect = sales ? Math.round((installs / sales) * 100) : 0;
  const pConnect = pSales ? Math.round((pInstalls / pSales) * 100) : 0;
  const active = rows.filter((r) => r.status === 'active').length;

  const day = (iso: string) => ymd(new Date(iso));
  const inRange = (iso: string | null, from: string, to: string) => !!iso && day(iso) >= from && day(iso) <= to;
  const applied = recruits.filter((r) => inRange(r.created_at, b.start, b.end)).length;
  const pApplied = recruits.filter((r) => inRange(r.created_at, b.prevStart, b.prevEnd)).length;
  const signed = recruits.filter((r) => inRange(r.signed_at, b.start, b.end)).length;
  const pSigned = recruits.filter((r) => inRange(r.signed_at, b.prevStart, b.prevEnd)).length;
  const overdue = recruits.filter((r) => r.next_follow_up && r.next_follow_up < ymd(new Date()) && !['signed', 'cold', 'not_fit'].includes(r.stage)).length;

  // projected override for the month: installs so far, paced to month end
  const now = new Date();
  const monthInstalls = total(within(rangeBounds('month').start, ymd(now)), 'installs');
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = (monthInstalls / now.getDate()) * dim * OVERRIDE_PER_INSTALL;

  const ind = new Map(rows.map((r) => [r.id, r.industry]));
  const w0 = weekStart();
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const s = ymd(addDays(w0, (i - 11) * 7)), e = ymd(addDays(w0, (i - 11) * 7 + 6));
    const wk = stats.filter((x) => ids.has(x.rep_id) && x.day >= s && x.day <= e);
    return {
      label: s.slice(5).replace('-', '/'),
      fiber: wk.filter((x) => ind.get(x.rep_id) === 'fiber').reduce((a, x) => a + x.sales, 0),
      pest: wk.filter((x) => ind.get(x.rep_id) === 'pest').reduce((a, x) => a + x.sales, 0),
    };
  });

  // door tracker, for the same reps, filters and range
  const doorsIn = (from: string, to: string) => doorRows.filter((d) => ids.has(d.rep_id) && d.day >= from && d.day <= to);
  const door = sumDoors(doorsIn(b.start, b.end));
  const pDoor = sumDoors(doorsIn(b.prevStart, b.prevEnd));
  const rate = closeRate(door), pRate = closeRate(pDoor);
  const mix = Object.entries(door.mix).filter(([, n]) => n > 0).sort((a, z) => z[1] - a[1]);
  const mixMax = Math.max(1, ...mix.map(([, n]) => n));
  // "Other" objections in the reps' own words, grouped (case-insensitive)
  const otherGroups = [...otherWords.filter((o) => ids.has(o.rep_id) && o.day >= b.start && o.day <= b.end)
    .reduce((m, o) => { const k = o.objection.toLowerCase(); const g = m.get(k) ?? { text: o.objection, n: 0 }; g.n++; return m.set(k, g); }, new Map<string, { text: string; n: number }>())
    .values()].sort((a, z) => z.n - a.n).slice(0, 10);
  const doorByRep = rows
    .map((r) => ({ ...r, d: sumDoors(doorsIn(b.start, b.end).filter((x) => x.rep_id === r.id)) }))
    .filter((r) => r.d.doors + r.d.objections + r.d.sales > 0)
    .sort((a, z) => z.d.doors - a.d.doors);

  const leaders = [...rows].sort((a, z) => z.rangeSales - a.rangeSales).slice(0, team ? 50 : 10);
  const label = { today: 'today', week: 'this week', month: 'this month', season: 'this season' }[f.range];
  const stageCounts = STAGES.map((s) => ({ ...s, n: recruits.filter((r) => r.stage === s.id).length }));

  return (
    <>
      <PageHead tag={team ? 'Team overview' : 'Overview'} title={team ? `Your team, ${label}.` : `The group, ${label}.`} />
      <FilterBar value={f} onChange={setF} markets={markets} />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}
      {team && reps.length === 0 && (
        <div className="mb-6 rounded-[10px] border border-dashed border-line p-6 text-center text-sm text-ink-muted">
          No reps are under you yet. Braden or Peter can add reps to your team, and their numbers will show up here.
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat k="Total sales" v={sales.toLocaleString()} sub={<Delta now={sales} prev={pSales} />} />
          <Stat k="Installs" v={installs.toLocaleString()} sub={<Delta now={installs} prev={pInstalls} />} />
          <Stat k="Connect rate" v={sales ? `${connect}%` : '—'} sub={<Delta now={connect} prev={pConnect} />} />
          <Stat k={team ? 'Active on your team' : 'Active reps'} v={active} sub={<span className="text-ink-muted">{rows.length} total</span>} />
          <Stat k="Applications" v={applied} sub={<Delta now={applied} prev={pApplied} />} />
          <Stat k="Recruits signed" v={signed} sub={<Delta now={signed} prev={pSigned} />} />
        </div>

        <Card tag="Door tracker" title="Doors, objections & sales" right={<a href={TRACK} className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-glow">Open tracker <ArrowRight className="h-4 w-4" /></a>}>
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat k="Doors knocked" v={door.doors.toLocaleString()} sub={<Delta now={door.doors} prev={pDoor.doors} />} />
              <Stat k="Objections" v={door.objections.toLocaleString()} sub={<Delta now={door.objections} prev={pDoor.objections} />} />
              <Stat k="Sales (tracked)" v={door.sales.toLocaleString()} sub={<Delta now={door.sales} prev={pDoor.sales} />} />
              <Stat k="Close rate" v={rate == null ? '—' : `${rate}%`} sub={<span className="text-ink-muted">{rate == null ? 'no doors yet' : pRate == null ? 'sales ÷ doors' : `${pRate}% previous`}</span>} />
            </div>
            {doorByRep.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-5 text-center text-sm text-ink-muted">
                No taps {label} yet. Reps open <b className="text-ink">Door tracker</b> from their account menu (or creedmarketing.org/#/track) on their phone and tap as they go.
              </p>
            ) : (
              <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <div className="overflow-x-auto rounded-md border border-line">
                  <table className="w-full text-sm tabular">
                    <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                      <tr className="border-b border-line [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                        <th>Rep</th><th className="text-right">Doors</th><th className="text-right">Objections</th><th className="text-right">Sales</th><th className="text-right">Close</th><th>Top objection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doorByRep.map((r) => {
                        const top = Object.entries(r.d.mix).sort((a, z) => z[1] - a[1])[0];
                        const cr = closeRate(r.d);
                        return (
                          <tr key={r.id} className="border-b border-line last:border-0 [&>td]:px-3 [&>td]:py-2">
                            <td className="font-semibold">{r.name}</td>
                            <td className="text-right font-mono text-gold-glow">{r.d.doors}</td>
                            <td className="text-right font-mono">{r.d.objections}</td>
                            <td className="text-right font-mono">{r.d.sales}</td>
                            <td className="text-right font-mono">{cr == null ? '—' : `${cr}%`}</td>
                            <td className="text-ink-muted">{top && top[1] > 0 ? `${objectionLabel(top[0])} (${top[1]})` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-gold-dim">What they&apos;re hearing</div>
                  {mix.length === 0 ? (
                    <p className="text-sm text-ink-muted">No objections logged {label}.</p>
                  ) : (
                    <div className="space-y-2">
                      {mix.map(([k, n]) => (
                        <div key={k} className="grid grid-cols-[150px_1fr_40px] items-center gap-2 text-sm">
                          <span className="truncate">{objectionLabel(k)}</span>
                          <span className="h-2.5 rounded-full bg-surface-raised"><span className="block h-full rounded-full bg-gold" style={{ width: `${(n / mixMax) * 100}%` }} /></span>
                          <span className="text-right font-mono text-gold-glow">{n}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {otherGroups.length > 0 && (
                    <div className="mt-5">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-gold-dim">&ldquo;Other&rdquo;, in their words</div>
                      <ul className="space-y-1.5 text-sm">
                        {otherGroups.map((g) => (
                          <li key={g.text} className="flex gap-2">
                            <span className="min-w-0 flex-1 text-ink">&ldquo;{g.text}&rdquo;</span>
                            {g.n > 1 && <span className="font-mono text-gold-glow">×{g.n}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Card tag="Trend" title="Sales by week" right={<span className="font-mono text-xs text-ink-muted">Last 12 weeks</span>}>
            <div className="p-4"><WeeklyBars weeks={weeks} /></div>
          </Card>
          <Card tag="Pipeline" title="Recruiting" right={<a href={`${DASH}/pipeline`} className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-glow">Open <ArrowRight className="h-4 w-4" /></a>}>
            <div className="space-y-2 p-4">
              {stageCounts.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
                  <Pill tone={stageTone[s.id]}>{s.label}</Pill>
                  <span className="font-mono text-lg text-gold-glow tabular">{s.n}</span>
                </div>
              ))}
              {overdue > 0 && <p className="pt-1 text-sm font-semibold text-[#d9705f]">{overdue} follow-up{overdue > 1 ? 's' : ''} overdue</p>}
              {!team && <div className="pt-2"><Stat k="Projected override, this month" v={money(projected)} sub={<span className="text-ink-muted">${OVERRIDE_PER_INSTALL} per install, paced to month end</span>} /></div>}
            </div>
          </Card>
        </div>

        <Card tag="Leaderboard" title={team ? 'Your team' : 'Top 10'} right={team ? undefined : <a href={`${DASH}/reps`} className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-glow">All reps <ArrowRight className="h-4 w-4" /></a>}>
          {leaders.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-muted">No reps match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular">
                <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  <tr className="border-b border-line [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                    <th>#</th><th>Rep</th><th>Industry</th><th>Market</th><th className="text-right">Sales</th><th className="text-right">Installs</th><th className="text-right">Connect</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((r, i) => (
                    <tr key={r.id} className="border-b border-line last:border-0 [&>td]:px-4 [&>td]:py-2.5">
                      <td className="font-mono text-gold">{i + 1}</td>
                      <td className="font-semibold">{r.name} {r.is_sample && <SampleTag />}</td>
                      <td><IndTag industry={r.industry} /></td>
                      <td>{r.marketName}</td>
                      <td className="text-right font-mono text-gold-glow">{r.rangeSales}</td>
                      <td className="text-right font-mono">{r.rangeInstalls}</td>
                      <td className="text-right font-mono">{r.connect == null ? '—' : `${r.connect}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
