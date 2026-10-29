import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Market, MarketRate } from "@/lib/types";
import type { CalcMarket } from "@/components/PayCalculator";

export async function getMarkets(): Promise<Market[]> {
  const supabase = createClient();
  const { data } = await supabase.from("markets").select("*").order("sort");
  return (data as Market[]) ?? [];
}

/**
 * Markets shaped for the calculator. Pass includeFull=true ONLY after confirming
 * the viewer is an owner — and even then the database (RLS) refuses market_rates
 * to anyone who isn't, so a rep can never receive these numbers.
 */
export async function getCalcMarkets(includeFull: boolean): Promise<CalcMarket[]> {
  const markets = await getMarkets();
  let rates: MarketRate[] = [];
  if (includeFull) {
    const supabase = createClient();
    const { data } = await supabase.from("market_rates").select("*");
    rates = (data as MarketRate[]) ?? [];
  }
  return markets
    .filter((m) => m.connect != null && (m.rep_base != null || includeFull) && m.industry !== "starlink")
    .map((m) => {
      const r = rates.find((x) => x.market_id === m.id);
      return {
        id: m.id,
        name: m.name,
        leads: m.leads,
        connect: Number(m.connect ?? 80),
        connectLabel: m.connect_label,
        provider: m.provider,
        pace: Number(m.pace ?? 2),
        paceTiers: m.pace_tiers,
        notes: m.notes ?? [],
        rep: {
          base: m.rep_base == null ? null : Number(m.rep_base),
          cap: m.rep_cap == null ? null : Number(m.rep_cap),
          step: m.rep_step ?? 20,
          bump: Number(m.rep_bump ?? 25),
          basis: m.rep_basis ?? "sold",
        },
        full: r
          ? Object.assign(
              { base: r.base == null ? null : Number(r.base), cap: r.cap == null ? null : Number(r.cap), step: r.step ?? 25, bump: Number(r.bump ?? 25), basis: r.basis ?? "sold" },
              { ownerNotes: r.owner_notes ?? [] }
            )
          : undefined,
      };
    });
}
