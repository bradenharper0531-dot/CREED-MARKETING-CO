"use client";
import { useState } from "react";
import PayCalculator, { type CalcMarket } from "@/components/PayCalculator";

/** Owner view = margin plan. Rep view = exactly what a rep sees in My Plan. */
export function PlanToggle({ ownerMarkets, repMarkets, userId, saved }: {
  ownerMarkets: CalcMarket[]; repMarkets: CalcMarket[]; userId: string; saved: object | null;
}) {
  const [view, setView] = useState<"owner" | "rep">("owner");
  return (
    <>
      <div className="filters">
        <div className="seg" role="group" aria-label="Plan view">
          <button aria-pressed={view === "owner"} onClick={() => setView("owner")}>Owner view</button>
          <button aria-pressed={view === "rep"} onClick={() => setView("rep")}>Rep view</button>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{view === "rep" ? "Previewing what reps see — no contract rates or spreads." : "Full pay, rep pay and your spread."}</span>
      </div>
      {view === "owner"
        ? <PayCalculator key="o" markets={ownerMarkets} mode="owner" userId={userId} saved={saved} />
        : <PayCalculator key="r" markets={repMarkets} mode="rep" />}
    </>
  );
}
