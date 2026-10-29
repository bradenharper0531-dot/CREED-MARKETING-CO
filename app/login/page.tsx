"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/site/Wordmark";

type Mode = "signin" | "signup" | "forgot";

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "signin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    params.get("error") ? { ok: false, text: "That link expired or was already used. Try again." } : null
  );
  const rawNext = params.get("next") || "/account";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  const site = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const supabase = createClient();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else if (mode === "signup") {
        const full_name = String(fd.get("full_name") || "").trim();
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name }, emailRedirectTo: `${site}/auth/callback?next=/account` },
        });
        if (error) throw error;
        if (data.session) { router.push("/account"); router.refresh(); }
        else setMsg({ ok: true, text: "Check your email to confirm your account, then log in." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site}/auth/callback?next=/auth/reset` });
        if (error) throw error;
        setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="box">
        <Wordmark />
        <h1>{mode === "signin" ? "Log in" : mode === "signup" ? "Create your account" : "Reset password"}</h1>
        {mode !== "forgot" && (
          <div className="seg" role="group">
            <button type="button" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>Log in</button>
            <button type="button" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>Sign up</button>
          </div>
        )}
        <form onSubmit={onSubmit} className="stack" style={{ gap: 14 }}>
          {mode === "signup" && <label className="field"><span>Full name</span><input name="full_name" required autoComplete="name" /></label>}
          <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
          {mode !== "forgot" && (
            <label className="field"><span>Password</span>
              <input name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              {mode === "signup" && <small>At least 8 characters.</small>}
            </label>
          )}
          {msg && <div className={`form-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "One sec…" : mode === "signin" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }} className="muted">
          {mode === "forgot"
            ? <button className="btn btn-ghost btn-sm" onClick={() => setMode("signin")}>← Back to log in</button>
            : <button className="btn btn-ghost btn-sm" onClick={() => setMode("forgot")}>Forgot password?</button>}
          <Link href="/" className="btn btn-ghost btn-sm">Home</Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
