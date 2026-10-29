"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PILLARS, type Checkin, type Pillar } from "@/lib/types";

const LABEL: Record<Pillar, string> = { physical: "Physical", spiritual: "Spiritual", mental: "Mental", financial: "Financial" };

/** Weekly 1–10 self-rating per pillar + a one-line goal each, saved to the rep's account. */
export function PillarCheckin({ userId, weekStart, current }: { userId: string; weekStart: string; current: Checkin | null }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<Pillar, number>>({
    physical: current?.physical ?? 5, spiritual: current?.spiritual ?? 5, mental: current?.mental ?? 5, financial: current?.financial ?? 5,
  });
  const [goals, setGoals] = useState<Partial<Record<Pillar, string>>>(current?.goals ?? {});
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");

  async function save() {
    setState("saving");
    const { error } = await createClient().from("pillar_checkins").upsert(
      { user_id: userId, week_start: weekStart, ...vals, goals },
      { onConflict: "user_id,week_start" }
    );
    setState(error ? "error" : "saved");
    if (!error) router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      {PILLARS.map((p) => (
        <div key={p} className="field" style={{ gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--display)", textTransform: "uppercase", letterSpacing: ".04em", fontSize: 16 }}>{LABEL[p]}</span>
            <span className="mono glow" style={{ fontSize: 20 }}>{vals[p]}<span className="muted" style={{ fontSize: 12 }}>/10</span></span>
          </div>
          <input type="range" min={1} max={10} value={vals[p]} aria-label={`${LABEL[p]} rating`}
            onChange={(e) => setVals((v) => ({ ...v, [p]: +e.target.value }))} style={{ padding: 0, accentColor: "var(--gold)", border: 0 }} />
          <input placeholder={`This week's ${LABEL[p].toLowerCase()} goal`} value={goals[p] ?? ""} maxLength={140}
            onChange={(e) => setGoals((g) => ({ ...g, [p]: e.target.value }))} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={save} disabled={state === "saving"}>{current ? "Update this week" : "Save this week"}</button>
        {state === "saved" && <span className="up" style={{ fontSize: 14 }}>Saved.</span>}
        {state === "error" && <span className="down" style={{ fontSize: 14 }}>Couldn&apos;t save — try again.</span>}
      </div>
    </div>
  );
}
