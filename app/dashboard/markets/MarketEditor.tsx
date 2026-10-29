"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Market, MarketRate } from "@/lib/types";
import { deleteMarket, saveMarket } from "../actions";

export function MarketEditor({ markets, rates }: { markets: Market[]; rates: MarketRate[] }) {
  const [sel, setSel] = useState<string | "new">(markets[0]?.id ?? "new");
  const m = sel === "new" ? null : markets.find((x) => x.id === sel) ?? null;
  const r = m ? rates.find((x) => x.market_id === m.id) ?? null : null;
  return (
    <div className="cols2" style={{ gridTemplateColumns: "minmax(200px,260px) 1fr" }}>
      <div className="card" style={{ alignSelf: "start" }}>
        <div className="card-head"><h3>Markets</h3></div>
        <div style={{ padding: 8, display: "grid", gap: 2 }}>
          {markets.map((x) => (
            <button key={x.id} className="btn btn-ghost" style={{ justifyContent: "space-between", color: sel === x.id ? "var(--gold)" : undefined, background: sel === x.id ? "var(--surface-raised)" : undefined }} onClick={() => setSel(x.id)}>
              <span>{x.name}</span><span className={`ind ind-${x.industry}`} style={{ border: 0, padding: 0 }} />
            </button>
          ))}
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setSel("new")}>+ Add market</button>
        </div>
      </div>
      <MarketForm key={sel} m={m} r={r} onDone={(id) => id && setSel(id)} />
    </div>
  );
}

function MarketForm({ m, r, onDone }: { m: Market | null; r: MarketRate | null; onDone: (id?: string) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const tiers = (m?.pace_tiers ?? []).map((t) => `${t.l}=${t.v}`).join("\n");
  return (
    <form className="stack" action={(fd) => start(async () => {
      try { await saveMarket(fd); setMsg({ ok: true, t: "Saved. The public site is updated." }); router.refresh(); }
      catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : "Save failed" }); }
    })}>
      {m && <input type="hidden" name="id" value={m.id} />}
      <section className="card">
        <div className="card-head"><span className="tag">Public</span><h3>{m ? m.name : "New market"}</h3></div>
        <div className="card-body">
          <div className="grid-auto">
            <label className="field"><span>Name</span><input name="name" defaultValue={m?.name} required /></label>
            <label className="field"><span>Industry</span><select name="industry" defaultValue={m?.industry ?? "fiber"}><option value="fiber">Fiber</option><option value="pest">Pest control</option><option value="starlink">Starlink</option></select></label>
            <label className="field"><span>Provider</span><input name="provider" defaultValue={m?.provider ?? ""} /></label>
            <label className="field"><span>Leads</span><input name="leads" defaultValue={m?.leads ?? ""} placeholder="80,000" /></label>
            <label className="field"><span>Connect rate (shown)</span><input name="connect_label" defaultValue={m?.connect_label ?? ""} placeholder="60–70%" /></label>
            <label className="field"><span>Connect % (math)</span><input name="connect" type="number" min={0} max={100} defaultValue={m?.connect ?? ""} /><small>Used by the calculator</small></label>
            <label className="field"><span>Pay line on public card</span><input name="public_rate_label" defaultValue={m?.public_rate_label ?? ""} placeholder="$325 per contract" /><small>Leave blank to hide pay publicly</small></label>
            <label className="field"><span>Default sales/day</span><input name="pace" type="number" step={0.5} defaultValue={m?.pace ?? 2} /></label>
            <label className="field"><span>Sort order</span><input name="sort" type="number" defaultValue={m?.sort ?? 0} /></label>
          </div>
          <div className="grid-auto">
            <label className="field"><span>Pace ladder</span><textarea name="pace_tiers" defaultValue={tiers} placeholder={"Avg 2–4=3\nDecent 5–7=6\nDawgs 8–12=10"} /><small>One per line: label=deals/day</small></label>
            <label className="field"><span>Public notes</span><textarea name="notes" defaultValue={(m?.notes ?? []).join("\n")} /><small>One per line</small></label>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><span className="tag">Rep pay</span><h3>What reps earn</h3><span className="muted" style={{ fontSize: 13 }}>Visible to reps in their calculator</span></div>
        <div className="card-body grid-auto">
          <label className="field"><span>Base / account</span><input name="rep_base" type="number" defaultValue={m?.rep_base ?? ""} /></label>
          <label className="field"><span>Cap / account</span><input name="rep_cap" type="number" defaultValue={m?.rep_cap ?? ""} /></label>
          <label className="field"><span>Raise every</span><input name="rep_step" type="number" defaultValue={m?.rep_step ?? 20} /><small>accounts in a month</small></label>
          <label className="field"><span>Raise amount</span><input name="rep_bump" type="number" defaultValue={m?.rep_bump ?? 25} /></label>
          <label className="field"><span>Counts</span><select name="rep_basis" defaultValue={m?.rep_basis ?? "sold"}><option value="sold">Sales</option><option value="installed">Installs</option></select></label>
        </div>
      </section>

      <section className="card" style={{ borderColor: "var(--gold-deep)" }}>
        <div className="card-head"><span className="tag">Owners only</span><h3>Full contract pay</h3><span className="owner-flag" style={{ marginLeft: "auto" }}>Never shown to reps</span></div>
        <div className="card-body">
          <div className="grid-auto">
            <label className="field"><span>Base / contract</span><input name="full_base" type="number" defaultValue={r?.base ?? ""} /></label>
            <label className="field"><span>Cap / contract</span><input name="full_cap" type="number" defaultValue={r?.cap ?? ""} /></label>
            <label className="field"><span>Raise every</span><input name="full_step" type="number" defaultValue={r?.step ?? 25} /></label>
            <label className="field"><span>Raise amount</span><input name="full_bump" type="number" defaultValue={r?.bump ?? 25} /></label>
            <label className="field"><span>Counts</span><select name="full_basis" defaultValue={r?.basis ?? "sold"}><option value="sold">Sales</option><option value="installed">Installs</option></select></label>
          </div>
          <label className="field"><span>Owner notes</span><textarea name="owner_notes" defaultValue={(r?.owner_notes ?? []).join("\n")} /></label>
        </div>
      </section>

      {msg && <div className={`form-msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save market"}</button>
        {m && <button type="button" className="btn btn-ghost down" style={{ marginLeft: "auto" }}
          onClick={() => confirm(`Delete ${m.name}? Reps in this market keep their records.`) && start(async () => { await deleteMarket(m.id); onDone(); router.refresh(); })}>Delete market</button>}
      </div>
    </form>
  );
}
