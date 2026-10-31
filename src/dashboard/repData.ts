import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { addDays, rangeBounds, ymd, type Range } from './dates.ts';
import type { MarketRow, Rep, RepStat } from './types.ts';

export type Filters = { industry: 'all' | 'fiber' | 'pest'; market: string; range: Range };
export const DEFAULT_FILTERS: Filters = { industry: 'all', market: 'all', range: 'month' };

export type RepRow = Rep & {
  marketName: string;
  today: number;
  week: number;
  month: number;
  season: number;
  rangeSales: number;
  rangeInstalls: number;
  connect: number | null;
  spark: number[];
};

/* Reps, markets and ~6 months of daily numbers, loaded once; filtering happens in the browser. */
export function useRepData() {
  const [reps, setReps] = useState<Rep[] | null>(null);
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [stats, setStats] = useState<RepStat[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    const since = ymd(addDays(new Date(), -200));
    const [r, m, s] = await Promise.all([
      supabase.from('reps').select('*').order('name'),
      supabase.from('markets').select('id, name, industry, sort').order('sort'),
      supabase.from('rep_stats').select('rep_id, day, sales, installs').gte('day', since).limit(50000),
    ]);
    if (r.error) setError(r.error.message);
    setReps((r.data as Rep[]) ?? []);
    setMarkets((m.data as MarketRow[]) ?? []);
    setStats((s.data as RepStat[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { reps, markets, stats, error, reload: load };
}

export function buildRows(reps: Rep[], markets: MarketRow[], stats: RepStat[], f: Filters): RepRow[] {
  const b = rangeBounds(f.range);
  const now = new Date();
  const today = ymd(now);
  const weekStart = rangeBounds('week').start;
  const monthStart = rangeBounds('month').start;
  const seasonStart = ymd(addDays(now, -97));
  const days30 = Array.from({ length: 30 }, (_, i) => ymd(addDays(now, i - 29)));
  const byRep = new Map<string, RepStat[]>();
  for (const s of stats) (byRep.get(s.rep_id) ?? byRep.set(s.rep_id, []).get(s.rep_id)!).push(s);

  return reps
    .filter((r) => (f.industry === 'all' || r.industry === f.industry) && (f.market === 'all' || r.market_id === f.market))
    .map((r) => {
      const s = byRep.get(r.id) ?? [];
      const sum = (from: string, to: string, k: 'sales' | 'installs') => s.reduce((a, x) => (x.day >= from && x.day <= to ? a + x[k] : a), 0);
      const rs = sum(b.start, b.end, 'sales');
      const ri = sum(b.start, b.end, 'installs');
      return {
        ...r,
        marketName: markets.find((m) => m.id === r.market_id)?.name ?? '—',
        today: sum(today, today, 'sales'),
        week: sum(weekStart, today, 'sales'),
        month: sum(monthStart, today, 'sales'),
        season: sum(seasonStart, today, 'sales'),
        rangeSales: rs,
        rangeInstalls: ri,
        connect: rs ? Math.round((ri / rs) * 100) : null,
        spark: days30.map((d) => s.find((x) => x.day === d)?.sales ?? 0),
      };
    });
}
