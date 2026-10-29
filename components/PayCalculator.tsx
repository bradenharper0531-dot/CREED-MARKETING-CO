"use client";
/**
 * Creed Growth Plan calculator — React port of the Creed Co Fiber Growth Plan
 * (mode "rep") and Creed Co Owner Plan (mode "owner"). Same math, same layout.
 * Owner mode is only ever rendered with `full` rates the server loaded for an owner.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { PayRules } from "@/lib/types";
import { autoDaysLeft, money, num, projector, rateLabel, rules } from "@/lib/payPlan";
import { createClient } from "@/lib/supabase/client";

export type CalcMarket = {
  id: string;
  name: string;
  leads: string | null;
  connect: number;
  connectLabel: string | null;
  provider: string | null;
  pace: number;
  paceTiers: { l: string; v: number }[] | null;
  notes: string[];
  rep: PayRules;
  full?: PayRules;
};

type Inputs = {
  mi: number; pace: number; days: number; weeks: number; yearWeeks: number; prior: number;
  reps: number; override: number; repPace: number; repDays: number; rb: boolean;
};
const DEF: Omit<Inputs, "pace"> = { mi: 0, days: 6, weeks: 14, yearWeeks: 40, prior: 0, reps: 5, override: 25, repPace: 1.5, repDays: 6, rb: false };

export default function PayCalculator({
  markets, mode, saved, userId, compact = false,
}: {
  markets: CalcMarket[];
  mode: "rep" | "owner";
  saved?: Partial<Inputs> | null;
  userId?: string | null;
  compact?: boolean;
}) {
  const initial = useMemo<Inputs>(() => {
    const s = { ...DEF, ...(saved || {}) } as Inputs;
    if (!(s.mi < markets.length)) s.mi = 0;
    if (s.pace == null) s.pace = markets[s.mi]?.pace ?? 2;
    return s;
  }, [saved, markets]);
  const [S, setS] = useState<Inputs>(initial);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved">("");
  useEffect(() => setDaysLeft(autoDaysLeft(initial.days)), [initial.days]);

  // Save inputs: to the rep's account when signed in, otherwise to this browser.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(async () => {
      if (userId) {
        setSaveState("saving");
        const supabase = createClient();
        await supabase.from("plan_inputs").upsert({ user_id: userId, inputs: S, updated_at: new Date().toISOString() });
        setSaveState("saved");
      } else {
        try { localStorage.setItem(`creed_${mode}_v1`, JSON.stringify(S)); } catch {}
      }
    }, 700);
    return () => clearTimeout(t);
  }, [S, userId, mode]);
  useEffect(() => {
    if (userId || saved) return;
    try {
      const raw = localStorage.getItem(`creed_${mode}_v1`);
      if (raw) setS((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {}
  }, [userId, saved, mode]);

  if (!markets.length) return <div className="empty">No markets yet.</div>;

  const set = (k: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((p) => ({ ...p, [k]: k === "rb" ? e.target.checked : Math.max(0, parseFloat(e.target.value) || 0) }));

  const m = markets[S.mi] ?? markets[0];
  const ir = m.connect / 100;
  const isOwner = mode === "owner" && !!m.full;
  const extra = !isOwner && S.rb ? 25 : 0;
  const R = rules(isOwner ? m.full! : m.rep, ir, extra);
  const wdm = (S.days * 52) / 12;
  const project = projector(R, S.prior, daysLeft, wdm);
  const pace = S.pace;
  const fullMonth = pace * wdm;
  const rows = [
    { l: "Day", ...project(pace, 1) },
    { l: "Week", ...project(pace, S.days) },
    { l: `Rest of this month (${num(daysLeft, 0)} days)`, ...project(pace, daysLeft) },
    { l: "Full month (starts at 0)", pay: R.payAt(fullMonth), sold: fullMonth, rate: R.rateAt(fullMonth) },
    { l: `Season (${num(S.weeks, 0)} wks)`, ...project(pace, S.days * S.weeks) },
    { l: `Year (${num(S.yearWeeks, 0)} wks)`, ...project(pace, S.days * S.yearWeeks) },
  ];
  const unit = R.basis === "installed" ? "installs" : "sales";
  const curRate = R.rateAt(S.prior);
  const toNext = R.step - (R.counted(S.prior) % R.step);
  const flat = R.base >= R.cap;
  const known = isFinite(R.base);

  const repWeekInst = S.repPace * ir * S.repDays;
  const teamWeek = repWeekInst * S.reps;
  const ovRows: [string, number][] = [
    ["Week", teamWeek], ["Month", (teamWeek * 52) / 12],
    [`Season (${num(S.weeks, 0)} wks)`, teamWeek * S.weeks], [`Year (${num(S.yearWeeks, 0)} wks)`, teamWeek * S.yearWeeks],
  ];
  const sizes = [1, 3, 5, 10, 15, 20, 30];
  if (S.reps && !sizes.includes(S.reps)) sizes.push(S.reps);
  sizes.sort((a, b) => a - b);
  const pS = rows[4].pay, pY = rows[5].pay, oS = teamWeek * S.weeks * S.override, oY = teamWeek * S.yearWeeks * S.override;

  const tiles: [string, string][] = [
    ["Leads", m.leads || "—"],
    ["Connect rate", m.connectLabel || `${m.connect}%`],
    [isOwner ? "Full pay / account" : "Pay per account", rateLabel(R)],
    ["Provider", m.provider || "—"],
  ];
  if (isOwner) tiles.push(["Rep pay / account", rateLabel(rules(m.rep, ir))]);

  return (
    <div className="calc">
      <div className="full grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <div className="stat"><span className="k">Personal / season</span><span className="v">{money(pS)}</span></div>
        <div className="stat"><span className="k">Override / season</span><span className="v">{money(oS)}</span></div>
        <div className="stat"><span className="k">Personal / year</span><span className="v">{money(pY)}</span></div>
        <div className="stat"><span className="k">Combined / year</span><span className="v" style={{ fontSize: 30 }}>{money(pY + oY)}</span></div>
      </div>

      <section className="card full">
        <div className="card-head"><span className="tag">Market</span><h3>Choose a market</h3>
          {userId && <span className="muted mono" style={{ marginLeft: "auto", fontSize: 12 }}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved to your account" : ""}</span>}
        </div>
        <div className="card-body">
          <label className="field"><span>Market</span>
            <select className="market" value={S.mi} onChange={(e) => { const mi = +e.target.value; setS((p) => ({ ...p, mi, pace: markets[mi].pace })); }}>
              {markets.map((mk, i) => <option key={mk.id} value={i}>{mk.name}</option>)}
            </select>
          </label>
          <div className="grid-auto">
            {tiles.map(([k, v]) => <div className="info" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>)}
          </div>
          {(isOwner ? [...m.notes, ...((m.full as PayRules & { ownerNotes?: string[] }).ownerNotes || [])] : m.notes).length > 0 && (
            <div><div className="label" style={{ marginBottom: 6 }}>Market notes</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                {(isOwner ? [...m.notes, ...((m.full as PayRules & { ownerNotes?: string[] }).ownerNotes || [])] : m.notes).map((n) => <li key={n}>{n}</li>)}
              </ul></div>
          )}
          {!known && <div className="warn">Pay details for {m.name} haven&apos;t been added yet, so earnings show as dashes.</div>}
        </div>
      </section>

      {!compact && (
        <section className="card full">
          <div className="card-head"><span className="tag">Inputs</span><h3>Your numbers</h3></div>
          <div className="card-body">
            <div className="grid-auto">
              <label className="field"><span>Sales per day</span><input type="number" min={0} step={0.5} value={S.pace} onChange={set("pace")} /><small>Your expected pace</small></label>
              <label className="field"><span>Days worked / week</span><input type="number" min={0} max={7} value={S.days} onChange={set("days")} /></label>
              <label className="field"><span>Weeks in season</span><input type="number" min={0} max={52} value={S.weeks} onChange={set("weeks")} /></label>
              <label className="field"><span>Weeks worked / year</span><input type="number" min={0} max={52} value={S.yearWeeks} onChange={set("yearWeeks")} /></label>
              <label className="field"><span>Sold so far this month</span><input type="number" min={0} value={S.prior} onChange={set("prior")} /><small>Counts toward this month&apos;s tier</small></label>
              <label className="field"><span>Work days left this month</span><input type="number" min={0} max={31} value={daysLeft} onChange={(e) => setDaysLeft(Math.max(0, parseFloat(e.target.value) || 0))} /><small>Filled from today&apos;s date</small></label>
            </div>
            {!isOwner && (
              <label className="check"><input type="checkbox" checked={S.rb} onChange={set("rb")} />
                <span>I&apos;ve brought on 2–3 friends who are signed and working <b className="glow">(+$25 base pay)</b></span></label>
            )}
            {m.paceTiers && (
              <div className="minichips" style={{ alignItems: "center" }}>
                <span className="label">{m.name} benchmarks:</span>
                {m.paceTiers.map((t) => <button key={t.l} type="button" className="chip" onClick={() => setS((p) => ({ ...p, pace: t.v }))}>{t.l}</button>)}
              </div>
            )}
            <div className="minichips">
              <span className="minichip">Installs/day <b>{num(pace * ir, 2)}</b></span>
              <span className="minichip">Value per door sale today <b>{money(curRate * ir)}</b></span>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head"><span className="tag">Output 1</span><h3>Projected personal revenue</h3></div>
        <div className="card-body">
          {known && (
            <div className="minichips">
              {flat ? <span className="minichip">Rate <b>{money(R.cap)}</b> per account</span> : <>
                <span className="minichip">This month&apos;s rate <b>{money(curRate)}</b>/acct</span>
                {curRate >= R.cap ? <span className="minichip">Max rate reached</span> :
                  <span className="minichip">Next raise in <b>{num(toNext, 0)}</b> {unit} → <b>{money(Math.min(R.cap, curRate + R.bump))}</b></span>}
                <span className="minichip">Full-month rate at your pace <b>{money(R.rateAt(fullMonth))}</b></span>
                <span className="minichip">Resets to <b>{money(R.base)}</b> on the 1st</span>
              </>}
            </div>
          )}
          <div className="well">
            <div className="label" style={{ color: "#b39a4a" }}>{flat || !known ? "This month" : "Raises pay back every account this month"}</div>
            <table className="otbl"><tbody>
              {[S.prior, rows[2].sold].map((n, i) => (
                <tr key={i}><td>{i ? "End of month" : "Right now"}: {flat || !known ? "" : "all "}{num(n, 0)} sold × {m.connect}% × {money(R.rateAt(n))}</td><td className="num big">{money(R.payAt(n))}</td></tr>
              ))}
            </tbody></table>
          </div>
          <div className="well">
            <div className="label" style={{ color: "#b39a4a" }}>Calculation</div>
            <div className="formula">
              {flat ? <><b>{num(pace, 2)}</b> sales/day × <b>{m.connect}%</b> connect × <b>{money(R.cap)}</b> per account. A month = <b>{num(wdm, 1)}</b> work days.</> :
                <>Rate starts at <b>{money(R.base)}</b> and goes up <b>{money(R.bump)}</b> for every <b>{num(R.step, 0)}</b> {unit} in the month, up to <b>{money(R.cap)}</b>. The raise applies to every account sold that month, and resets on the 1st. <b>{num(pace, 2)}</b> sales/day × <b>{m.connect}%</b> connect; a month = <b>{num(wdm, 1)}</b> work days.</>}
            </div>
            <div className="tbl-wrap"><table className="otbl">
              <thead><tr><th>Through</th><th className="num">Sold</th><th className="num">Rate</th><th className="num">Total pay</th></tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={r.l}><td>{r.l}</td><td className="num">{num(r.sold, 0)}</td><td className="num">{money(r.rate)}</td><td className={`num${i >= 4 ? " big" : ""}`}>{money(r.pay)}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><span className="tag">Output 2</span><h3>Recruiting overrides</h3></div>
        <div className="card-body">
          <div className="grid-auto">
            <label className="field"><span>Number of reps</span><input type="number" min={0} value={S.reps} onChange={set("reps")} /></label>
            <label className="field"><span>Override per install</span><input type="number" min={0} step={5} value={S.override} onChange={set("override")} /><small>Dollars</small></label>
            <label className="field"><span>Rep sales / day</span><input type="number" min={0} step={0.5} value={S.repPace} onChange={set("repPace")} /><small>Newer reps often sell less</small></label>
            <label className="field"><span>Rep days / week</span><input type="number" min={0} max={7} value={S.repDays} onChange={set("repDays")} /></label>
          </div>
          <div className="warn"><b>Recruiting bonus:</b> bring on 2–3 friends, and as soon as they&apos;re signed and working, your base pay goes up $25 per account automatically.</div>
          <div className="well">
            <div className="label" style={{ color: "#b39a4a" }}>Calculation</div>
            <div className="formula"><b>{num(S.reps, 0)}</b> reps × <b>{num(S.repPace, 2)}</b> sales/day × <b>{m.connect}%</b> × <b>{num(S.repDays, 0)}</b> days × <b>{money(S.override)}</b> = <b>{money(teamWeek * S.override)}</b>/week</div>
            <table className="otbl"><thead><tr><th>Period</th><th className="num">Team installs</th><th className="num">Your override</th></tr></thead>
              <tbody>{ovRows.map(([l, n], i) => <tr key={l}><td>{l}</td><td className="num">{num(n, 1)}</td><td className={`num${i >= 2 ? " big" : ""}`}>{money(n * S.override)}</td></tr>)}</tbody></table>
          </div>
          <div className="well">
            <div className="label" style={{ color: "#b39a4a" }}>Override by team size (per season)</div>
            <table className="otbl"><tbody>{sizes.map((n) => (
              <tr key={n} className={n === S.reps ? "sel" : ""}><td>{n} rep{n > 1 ? "s" : ""}{n === S.reps ? " (current)" : ""}</td><td className="num">{money(repWeekInst * n * S.weeks * S.override)}</td></tr>
            ))}</tbody></table>
          </div>
          <div className="well">
            <div className="label" style={{ color: "#b39a4a" }}>Personal + override total</div>
            <table className="otbl"><tbody>
              <tr><td>Season: personal {money(pS)} + override {money(oS)}</td><td className="num big">{money(pS + oS)}</td></tr>
              <tr><td>Year: personal {money(pY)} + override {money(oY)}</td><td className="num big">{money(pY + oY)}</td></tr>
            </tbody></table>
          </div>
        </div>
      </section>

      {isOwner && <OwnerSpread markets={markets} S={S} mi={S.mi} />}
    </div>
  );
}

function OwnerSpread({ markets, S, mi }: { markets: CalcMarket[]; S: Inputs; mi: number }) {
  const m = markets[mi];
  const ir = m.connect / 100;
  const F = rules(m.full!, ir), P = rules(m.rep, ir);
  const wdm = (S.repDays * 52) / 12;
  const rd = S.repDays * S.weeks;
  const full = projector(F, 0, 0, wdm)(S.repPace, rd).pay;
  const rep = projector(P, 0, 0, wdm)(S.repPace, rd).pay;
  return (
    <section className="card full">
      <div className="card-head"><span className="tag">Owners</span><h3>Full pay vs. rep pay</h3><span className="owner-flag" style={{ marginLeft: "auto" }}>Owners only</span></div>
      <div className="card-body">
        <div className="well"><div className="label" style={{ color: "#b39a4a" }}>Per account, every market</div>
          <div className="tbl-wrap"><table className="otbl">
            <thead><tr><th>Market</th><th className="num">Full pay</th><th className="num">Rep pay</th><th className="num">Spread at start</th><th className="num">Spread at max</th></tr></thead>
            <tbody>{markets.filter((mk) => mk.full).map((mk) => {
              const f = rules(mk.full!, mk.connect / 100), p = rules(mk.rep, mk.connect / 100);
              return <tr key={mk.id} className={mk.id === m.id ? "sel" : ""}><td>{mk.name}</td><td className="num">{rateLabel(f)}</td><td className="num">{rateLabel(p)}</td><td className="num">{money(f.base - p.base)}</td><td className="num">{money(f.cap - p.cap)}</td></tr>;
            })}</tbody>
          </table></div>
        </div>
        <div className="well"><div className="label" style={{ color: "#b39a4a" }}>Spread in the selected market (per season)</div>
          <div className="formula">{m.name}: <b>{num(S.repPace, 2)}</b> sales/day × <b>{num(S.repDays, 0)}</b> days × <b>{num(S.weeks, 0)}</b> wks × <b>{m.connect}%</b>, paid month by month at full rates vs. rep rates. Uses the rep inputs in Recruiting Overrides.</div>
          <table className="otbl"><tbody>
            <tr><td>Full pay on one rep&apos;s season</td><td className="num">{money(full)}</td></tr>
            <tr><td>Rep is paid</td><td className="num">{money(rep)}</td></tr>
            <tr><td>Spread per rep</td><td className="num big">{money(full - rep)}</td></tr>
            <tr><td>Spread across {num(S.reps, 0)} reps</td><td className="num big">{money((full - rep) * S.reps)}</td></tr>
          </tbody></table>
        </div>
      </div>
    </section>
  );
}
