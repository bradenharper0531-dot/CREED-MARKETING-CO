import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadRepRows, parseFilters, type SP } from "@/lib/dashboard";
import { Filters } from "@/components/app/Filters";
import { WeeklyBars } from "@/components/app/charts";
import { addDays, rangeBounds, weekStart, ymd } from "@/lib/dates";
import { money } from "@/lib/payPlan";
import { PILLARS } from "@/lib/types";

const OVERRIDE_PER_INSTALL = 25; // matches the calculator default

function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev && !now) return <span className="d muted">—</span>;
  if (!prev) return <span className="d up">▲ new</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  return <span className={`d ${pct >= 0 ? "up" : "down"}`}>{pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% vs. previous</span>;
}

export default async function Overview({ searchParams }: { searchParams: SP }) {
  const f = parseFilters(searchParams);
  const { rows, markets, stats, bounds } = await loadRepRows(f);
  const supabase = createClient();
  const monthStart = rangeBounds("month").start;
  const [{ count: signed }, checkRes] = await Promise.all([
    supabase.from("recruits").select("id", { count: "exact", head: true }).eq("stage", "signed").gte("signed_at", monthStart),
    supabase.from("pillar_checkins").select("user_id, week_start, physical, spiritual, mental, financial").order("week_start", { ascending: false }).limit(1000),
  ]);

  const ids = new Set(rows.map((r) => r.id));
  const inRange = (from: string, to: string) => stats.filter((s) => ids.has(s.rep_id) && s.day >= from && s.day <= to);
  const sum = (a: { sales: number; installs: number }[], k: "sales" | "installs") => a.reduce((t, x) => t + x[k], 0);
  const cur = inRange(bounds.start, bounds.end), prev = inRange(bounds.prevStart, bounds.prevEnd);
  const sales = sum(cur, "sales"), installs = sum(cur, "installs");
  const pSales = sum(prev, "sales"), pInstalls = sum(prev, "installs");
  const connect = sales ? Math.round((installs / sales) * 100) : 0;
  const pConnect = pSales ? Math.round((pInstalls / pSales) * 100) : 0;
  const active = rows.filter((r) => r.status === "active").length;

  // Projected override this month: installs so far, paced to month end, × $25.
  const now = new Date();
  const monthInstalls = sum(inRange(monthStart, ymd(now)), "installs");
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = (monthInstalls / now.getDate()) * dim * OVERRIDE_PER_INSTALL;

  // Last 12 weeks, fiber vs pest
  const ind = new Map(rows.map((r) => [r.id, r.industry]));
  const w0 = weekStart();
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const s = ymd(addDays(w0, (i - 11) * 7)), e = ymd(addDays(w0, (i - 11) * 7 + 6));
    const wk = stats.filter((x) => ids.has(x.rep_id) && x.day >= s && x.day <= e);
    return {
      label: s.slice(5).replace("-", "/"),
      fiber: wk.filter((x) => ind.get(x.rep_id) === "fiber").reduce((a, x) => a + x.sales, 0),
      pest: wk.filter((x) => ind.get(x.rep_id) === "pest").reduce((a, x) => a + x.sales, 0),
    };
  });

  const leaders = [...rows].sort((a, b) => b.rangeSales - a.rangeSales).slice(0, 10);

  // Team pillar average from each person's latest check-in
  const latest = new Map<string, Record<string, number | null>>();
  for (const c of checkRes.data ?? []) if (!latest.has(c.user_id)) latest.set(c.user_id, c);
  const avg = (k: string) => {
    const v = [...latest.values()].map((c) => c[k]).filter((x): x is number => typeof x === "number");
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—";
  };

  const rangeLabel = { today: "today", week: "this week", month: "this month", season: "this season" }[f.range];

  return (
    <>
      <div className="page-head">
        <div><span className="tag">Overview</span><h1 style={{ marginTop: 10 }}>The group, {rangeLabel}.</h1></div>
      </div>
      <Suspense><Filters markets={markets} /></Suspense>

      <div className="stack">
        <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
          <div className="stat"><span className="k">Total sales</span><span className="v">{sales.toLocaleString()}</span><Delta now={sales} prev={pSales} /></div>
          <div className="stat"><span className="k">Installs</span><span className="v">{installs.toLocaleString()}</span><Delta now={installs} prev={pInstalls} /></div>
          <div className="stat"><span className="k">Connect rate</span><span className="v">{sales ? `${connect}%` : "—"}</span><Delta now={connect} prev={pConnect} /></div>
          <div className="stat"><span className="k">Active reps</span><span className="v">{active}</span><span className="d muted">{rows.length} total</span></div>
          <div className="stat"><span className="k">Recruits signed</span><span className="v">{signed ?? 0}</span><span className="d muted">this month</span></div>
          <div className="stat"><span className="k">Projected override</span><span className="v">{money(projected)}</span><span className="d muted">month · ${OVERRIDE_PER_INSTALL}/install</span></div>
        </div>

        <div className="cols2">
          <section className="card">
            <div className="card-head"><span className="tag">Trend</span><h2>Sales by week</h2><span className="muted mono" style={{ marginLeft: "auto", fontSize: 12 }}>Last 12 weeks</span></div>
            <div className="card-body"><WeeklyBars weeks={weeks} /></div>
          </section>
          <section className="card">
            <div className="card-head"><span className="tag">Pillars</span><h2>Team average</h2><span className="muted mono" style={{ marginLeft: "auto", fontSize: 12 }}>{latest.size} check-ins</span></div>
            <div className="card-body">
              <div className="grid-auto" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {PILLARS.map((p) => <div className="stat" key={p}><span className="k">{p}</span><span className="v">{avg(p)}<span className="muted" style={{ fontSize: 13 }}>/10</span></span></div>)}
              </div>
              <p className="muted" style={{ fontSize: 13 }}>From each rep&apos;s most recent weekly check-in on My Plan.</p>
            </div>
          </section>
        </div>

        <section className="card">
          <div className="card-head"><span className="tag">Leaderboard</span><h2>Top 10</h2><Link href="/dashboard/reps" className="btn btn-sm" style={{ marginLeft: "auto" }}>All reps</Link></div>
          <div className="tbl-wrap">
            {leaders.length === 0 ? <div className="empty" style={{ margin: 16 }}>No reps match these filters.</div> : (
              <table className="tbl cards">
                <thead><tr><th>#</th><th>Rep</th><th>Industry</th><th>Market</th><th className="num">Sales</th><th className="num">Installs</th><th className="num">Connect</th></tr></thead>
                <tbody>{leaders.map((r, i) => (
                  <tr key={r.id}>
                    <td data-l="Rank" className="mono gold">{i + 1}</td>
                    <td data-l="Rep" className="lead">{r.name} {r.is_sample && <span className="sample">sample</span>}</td>
                    <td data-l="Industry"><span className={`ind ind-${r.industry}`}>{r.industry === "pest" ? "Pest" : "Fiber"}</span></td>
                    <td data-l="Market">{r.marketName}</td>
                    <td data-l="Sales" className="num glow">{r.rangeSales}</td>
                    <td data-l="Installs" className="num">{r.rangeInstalls}</td>
                    <td data-l="Connect" className="num">{r.connect == null ? "—" : `${r.connect}%`}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
