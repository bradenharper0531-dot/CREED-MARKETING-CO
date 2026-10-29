import { Suspense } from "react";
import { loadRepRows, parseFilters, type SP } from "@/lib/dashboard";
import { Filters } from "@/components/app/Filters";
import { RepsTable } from "./RepsTable";

export default async function RepsPage({ searchParams }: { searchParams: SP }) {
  const f = parseFilters(searchParams);
  const { rows, markets, stats } = await loadRepRows(f);
  const ids = new Set(rows.map((r) => r.id));
  return (
    <>
      <div className="page-head"><div><span className="tag">Reps</span><h1 style={{ marginTop: 10 }}>Every rep, every number.</h1></div></div>
      <Suspense><Filters markets={markets} /></Suspense>
      <RepsTable rows={rows} markets={markets} history={stats.filter((s) => ids.has(s.rep_id))} range={f.range} />
    </>
  );
}
