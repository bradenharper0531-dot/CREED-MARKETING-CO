"use client";
import { useFormState, useFormStatus } from "react-dom";
import { submitApplication, type ApplyState } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send my application"}</button>;
}

export function ApplyForm({ markets }: { markets: string[] }) {
  const [state, action] = useFormState<ApplyState, FormData>(submitApplication, { ok: false, msg: "" });
  if (state.ok) {
    return <div className="form-msg ok" style={{ marginTop: 40, fontSize: 18, padding: 20 }}>{state.msg}</div>;
  }
  return (
    <form action={action} className="apply">
      <label className="field"><span>Full name</span><input name="name" required autoComplete="name" /></label>
      <label className="field"><span>Phone</span><input name="phone" type="tel" required autoComplete="tel" /></label>
      <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
      <label className="field"><span>Instagram</span><input name="instagram" placeholder="@handle" /></label>
      <label className="field"><span>Industry interest</span>
        <select name="industry_interest" defaultValue="either">
          <option value="fiber">Fiber</option><option value="pest">Pest control</option><option value="either">Either</option>
        </select></label>
      <label className="field"><span>Preferred market</span>
        <select name="preferred_market" defaultValue="">
          <option value="">No preference</option>
          {markets.map((m) => <option key={m}>{m}</option>)}
        </select></label>
      <label className="field"><span>Which pillar do you most want to grow?</span>
        <select name="pillar" defaultValue="physical">
          <option value="physical">Physical</option><option value="spiritual">Spiritual</option>
          <option value="mental">Mental</option><option value="financial">Financial</option>
        </select></label>
      <label className="field"><span>How did you hear about us?</span><input name="source" placeholder="Friend, Instagram, campus…" /></label>
      {/* honeypot: real people never fill this in */}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
      {state.msg && <div className="form-msg err full">{state.msg}</div>}
      <div className="full"><Submit /></div>
    </form>
  );
}
