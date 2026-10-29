"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/site/Wordmark";

export default function ResetPassword() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth">
      <div className="box">
        <Wordmark />
        <h1>New password</h1>
        <form
          className="stack" style={{ gap: 14 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const password = String(new FormData(e.currentTarget).get("password") || "");
            setBusy(true);
            const { error } = await createClient().auth.updateUser({ password });
            setBusy(false);
            if (error) return setMsg({ ok: false, text: error.message });
            setMsg({ ok: true, text: "Password updated." });
            setTimeout(() => { router.push("/account"); router.refresh(); }, 800);
          }}
        >
          <label className="field"><span>New password</span><input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
          {msg && <div className={`form-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
          <button className="btn btn-primary" disabled={busy}>Save password</button>
        </form>
      </div>
    </main>
  );
}
