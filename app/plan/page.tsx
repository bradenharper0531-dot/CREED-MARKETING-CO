import { requireUser, firstName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCalcMarkets } from "@/lib/markets";
import { Shell } from "@/components/app/Shell";
import PayCalculator from "@/components/PayCalculator";
import { PillarCheckin } from "@/components/app/PillarCheckin";
import { PillarTrend, Sparkline } from "@/components/app/charts";
import { addDays, weekStart, ymd } from "@/lib/dates";
import type { Checkin, Rep, RepStat } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyPlan() {
  const viewer = await requireUser();
  const supabase = createClient();
  const week = ymd(weekStart());

  // Reps only ever get REP pay rules — getCalcMarkets(false) never touches market_rates.
  const [markets, inputsRes, checkinsRes, repRes] = await Promise.all([
    getCalcMarkets(false),
    supabase.from("plan_inputs").select("inputs").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("pillar_checkins").select("*").eq("user_id", viewer.id).order("week_start").limit(26),
    supabase.from("reps").select("*").eq("profile_id", viewer.id).maybeSingle(),
  ]);
  const checkins = (checkinsRes.data as Checkin[]) ?? [];
  const thisWeek = checkins.find((c) => c.week_start === week) ?? null;
  const rep = repRes.data as Rep | null;

  let stats: RepStat[] = [];
  if (rep) {
    const { data } = await supabase.from("rep_stats").select("*").eq("rep_id", rep.id).gte("day", ymd(addDays(new Date(), -90))).order("day");
    stats = (data as RepStat[]) ?? [];
  }
  const sum = (from: string) => stats.filter((s) => s.day >= from).reduce((a, s) => ({ sales: a.sales + s.sales, installs: a.installs + s.installs }), { sales: 0, installs: 0 });
  const today = sum(ymd(new Date())), wk = sum(week), mo = sum(ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const last30 = Array.from({ length: 30 }, (_, i) => ymd(addDays(new Date(), i - 29))).map((d) => stats.find((s) => s.day === d)?.sales ?? 0);

  const links = [{ href: "/plan", label: "My Plan", exact: true }];
  if (viewer.role === "owner") links.push({ href: "/dashboard", label: "Owner dashboard", exact: false });

  return (
    <Shell viewer={viewer} links={links}>
      <div className="page-head">
        <div>
          <span className="tag">My plan</span>
          <h1 style={{ marginTop: 10 }}>Let&apos;s work, {firstName(viewer)}.</h1>
        </div>
      </div>

      <div className="stack">
        {rep && (
          <section className="card">
            <div className="card-head"><span className="tag">My numbers</span><h2>Sales</h2><span className={`ind ind-${rep.industry}`} style={{ marginLeft: "auto" }}>{rep.industry === "pest" ? "Pest control" : "Fiber"}</span></div>
            <div className="card-body">
              <div className="grid-auto">
                <div className="stat"><span className="k">Today</span><span className="v">{today.sales}</span></div>
                <div className="stat"><span className="k">This week</span><span className="v">{wk.sales}</span></div>
                <div className="stat"><span className="k">This month</span><span className="v">{mo.sales}</span></div>
                <div className="stat"><span className="k">Installs this month</span><span className="v">{mo.installs}</span></div>
              </div>
              <div><div className="label" style={{ marginBottom: 6 }}>Last 30 days</div>
                <Sparkline values={last30} w={600} h={56} color={rep.industry === "pest" ? "var(--pest)" : "var(--gold)"} /></div>
            </div>
          </section>
        )}

        <section className="cols2">
          <div className="card">
            <div className="card-head"><span className="tag">My pillars</span><h2>Weekly check-in</h2><span className="muted mono" style={{ marginLeft: "auto", fontSize: 12 }}>Week of {week}</span></div>
            <div className="card-body"><PillarCheckin userId={viewer.id} weekStart={week} current={thisWeek} /></div>
          </div>
          <div className="card">
            <div className="card-head"><span className="tag">Trend</span><h2>How I&apos;m growing</h2></div>
            <div className="card-body">
              <PillarTrend rows={checkins.map((c) => ({ week: c.week_start, physical: c.physical, spiritual: c.spiritual, mental: c.mental, financial: c.financial }))} />
            </div>
          </div>
        </section>

        <section>
          <div className="page-head" style={{ marginBottom: 16 }}><div><span className="tag">Growth plan</span><h2 style={{ marginTop: 10, fontSize: 28 }}>Run your numbers</h2></div></div>
          <PayCalculator markets={markets} mode="rep" userId={viewer.id} saved={(inputsRes.data?.inputs as object) ?? null} />
        </section>
      </div>
    </Shell>
  );
}
