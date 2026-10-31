import { useEffect, useState } from 'react';
import type { PayRule } from './payPlan.ts';
import { supabase } from './supabase.ts';
import { useAuth } from './auth.tsx';

/* Full contract pay per market, keyed by market name. Only ever requested for
   owners — and the database (row-level security on `market_rates`) returns
   nothing to anyone else, so these numbers never reach a rep's browser. */
export function useOwnerRates() {
  const { profile } = useAuth();
  const [rates, setRates] = useState<Record<string, PayRule>>({});
  const isOwner = profile?.role === 'owner';

  useEffect(() => {
    if (!isOwner || !supabase) {
      setRates({});
      return;
    }
    let alive = true;
    supabase
      .from('markets')
      .select('name, market_rates(base, cap, step, bump, basis)')
      .then(({ data }) => {
        if (!alive || !data) return;
        const out: Record<string, PayRule> = {};
        for (const m of data as { name: string; market_rates: Partial<PayRule> | Partial<PayRule>[] | null }[]) {
          const r = Array.isArray(m.market_rates) ? m.market_rates[0] : m.market_rates;
          if (r && r.base != null && r.cap != null) {
            out[m.name] = { base: Number(r.base), cap: Number(r.cap), step: Number(r.step ?? 25), bump: Number(r.bump ?? 25), basis: r.basis === 'installed' ? 'installed' : 'sold' };
          }
        }
        setRates(out);
      });
    return () => {
      alive = false;
    };
  }, [isOwner]);

  return { isOwner, rates };
}
