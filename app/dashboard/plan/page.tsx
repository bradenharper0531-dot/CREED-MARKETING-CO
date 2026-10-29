import { getCalcMarkets } from "@/lib/markets";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlanToggle } from "./PlanToggle";

export default async function OwnerPlan() {
  const viewer = await requireOwner(); // double-check before loading margin numbers
  const supabase = createClient();
  const [ownerMarkets, repMarkets, saved] = await Promise.all([
    getCalcMarkets(true),
    getCalcMarkets(false),
    supabase.from("plan_inputs").select("inputs").eq("user_id", viewer.id).maybeSingle(),
  ]);
  return (
    <>
      <div className="page-head">
        <div><span className="tag">Margin plan</span><h1 style={{ marginTop: 10 }}>Creed Co Owner Plan.</h1>
          <p className="muted" style={{ marginTop: 8 }}>Full contract values and caps for every market, side by side with what reps see.</p></div>
        <span className="owner-flag">Owners only · do not share with reps</span>
      </div>
      <PlanToggle ownerMarkets={ownerMarkets} repMarkets={repMarkets} userId={viewer.id} saved={(saved.data?.inputs as object) ?? null} />
    </>
  );
}
