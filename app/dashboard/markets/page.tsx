import { createClient } from "@/lib/supabase/server";
import type { Market, MarketRate } from "@/lib/types";
import { MarketEditor } from "./MarketEditor";

export default async function MarketsPage() {
  const supabase = createClient();
  const [m, r] = await Promise.all([
    supabase.from("markets").select("*").order("sort"),
    supabase.from("market_rates").select("*"),
  ]);
  return (
    <>
      <div className="page-head">
        <div><span className="tag">Markets</span><h1 style={{ marginTop: 10 }}>Market data.</h1>
          <p className="muted" style={{ marginTop: 8, maxWidth: "70ch" }}>
            Public fields update the public site and the rep calculator immediately. Full contract pay is owner-only — it only ever shows on the margin plan.
          </p></div>
      </div>
      <MarketEditor markets={(m.data as Market[]) ?? []} rates={(r.data as MarketRate[]) ?? []} />
    </>
  );
}
