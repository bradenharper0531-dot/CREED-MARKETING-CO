import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, rangeBounds, ymd, type Range } from "@/lib/dates";
import type { Rep, RepStat } from "@/lib/types";

export type SP = { [k: string]: string | string[] | undefined };
export function parseFilters(sp: SP) {
  const g = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const industry = (["fiber", "pest"].includes(g("industry") ?? "") ? g("industry") : "all") as "all" | "fiber" | "pest";
  const market = g("market") ?? "all";
  const range = (["today", "week", "month", "season"].includes(g("range") ?? "") ? g("range") : "month") as Range;
  return { industry, market, range };
}

export type RepRow = Rep & {
  marketName: string;
  today: number; week: number; month: number; season: number;
  rangeSales: number; rangeInstalls: number; prevSales: number;
  connect: number | null;
  spark: number[];
  pillar: { physical: number | null; spiritual: number | null; mental: number | null; financial: number | null } | null;
};

/** Reps + their numbers, filtered by industry and market, for the chosen range. */
export async function loadRepRows(f: ReturnType<typeof parseFilters>) {
  const supabase = createClient();
  const b = rangeBounds(f.range);
  const seasonStart = ymd(addDays(new Date(), -97));
  const earliest = [b.prevStart, seasonStart].sort()[0];
  const [repsRes, marketsRes, statsRes, checkRes] = await Promise.all([
    supabase.from("reps").select("*").order("name"),
    supabase.from("markets").select("id, name").order("sort"),
    supabase.from("rep_stats").select("rep_id, day, sales, installs").gte("day", earliest).limit(20000),
    supabase.from("pillar_checkins").select("user_id, week_start, physical, spiritual, mental, financial").order("week_start", { ascending: false }).limit(2000),
  ]);
  const markets = (marketsRes.data ?? []) as { id: string; name: string }[];
  const stats = (statsRes.data ?? []) as RepStat[];
  const checkins = checkRes.data ?? [];
  const now = new Date();
  const today = ymd(now);
  const weekStartDay = rangeBounds("week").start;
  const monthStart = rangeBounds("month").start;
  const days30 = Array.from({ length: 30 }, (_, i) => ymd(addDays(now, i - 29)));

  const reps = ((repsRes.data ?? []) as Rep[]).filter(
    (r) => (f.industry === "all" || r.industry === f.industry) && (f.market === "all" || r.market_id === f.market)
  );

  const rows: RepRow[] = reps.map((r) => {
    const s = stats.filter((x) => x.rep_id === r.id);
    const sumS = (from: string, to = today) => s.filter((x) => x.day >= from && x.day <= to).reduce((a, x) => a + x.sales, 0);
    const sumI = (from: string, to = today) => s.filter((x) => x.day >= from && x.day <= to).reduce((a, x) => a + x.installs, 0);
    const rs = sumS(b.start, b.end), ri = sumI(b.start, b.end);
    const ch = r.profile_id ? checkins.find((c) => c.user_id === r.profile_id) : undefined;
    return {
      ...r,
      marketName: markets.find((m) => m.id === r.market_id)?.name ?? "—",
      today: sumS(today), week: sumS(weekStartDay), month: sumS(monthStart), season: sumS(seasonStart),
      rangeSales: rs, rangeInstalls: ri, prevSales: sumS(b.prevStart, b.prevEnd),
      connect: rs ? Math.round((ri / rs) * 100) : null,
      spark: days30.map((d) => s.find((x) => x.day === d)?.sales ?? 0),
      pillar: ch ? { physical: ch.physical, spiritual: ch.spiritual, mental: ch.mental, financial: ch.financial } : null,
    };
  });
  return { rows, markets, stats, bounds: b, repsAll: reps };
}
