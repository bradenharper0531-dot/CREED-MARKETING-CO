"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGES } from "@/lib/dates";

/** Global dashboard filters as chips: Industry · Market · Date range. Stored in the URL. */
export function Filters({ markets, showRange = true }: { markets: { id: string; name: string }[]; showRange?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const ind = sp.get("industry") ?? "all";
  const mkt = sp.get("market") ?? "all";
  const range = sp.get("range") ?? "month";
  const set = (k: string, v: string, def: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v === def) p.delete(k); else p.set(k, v);
    router.replace(`${path}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };
  return (
    <div className="filters">
      {[["all", "All"], ["fiber", "Fiber"], ["pest", "Pest control"]].map(([id, l]) => (
        <button key={id} className="chip" aria-pressed={ind === id} onClick={() => set("industry", id, "all")}>{l}</button>
      ))}
      <span className="sep" />
      <select value={mkt} onChange={(e) => set("market", e.target.value, "all")} aria-label="Market"
        className="chip" style={{ width: "auto", padding: "7px 14px", color: mkt === "all" ? "var(--ink-muted)" : "var(--gold)" }}>
        <option value="all">All markets</option>
        {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {showRange && <>
        <span className="sep" />
        {RANGES.map((r) => <button key={r.id} className="chip" aria-pressed={range === r.id} onClick={() => set("range", r.id, "month")}>{r.label}</button>)}
      </>}
    </div>
  );
}
