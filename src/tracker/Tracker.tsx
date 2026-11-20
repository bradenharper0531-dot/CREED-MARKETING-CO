import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, DoorClosed, Handshake, Lock, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { Logo } from '../components/Logo.tsx';
import { useAuth } from '../lib/auth.tsx';
import { isConfigured, supabase } from '../lib/supabase.ts';
import { closeRate, OBJECTIONS, objectionLabel, sumDoors, type DoorCount, type DoorTotals } from '../lib/doors.ts';
import { addDays, weekStart, ymd } from '../dashboard/dates.ts';

/* The rep's door tracker — creedmarketing.org/#/track. Built for one thumb on a
   phone in the street: tap Door at every door, tap the objection you got, tap Sale
   when you close. Taps save instantly (the count updates before the network does)
   and go through the database's track() function, which knows which rep you are
   from your login. Undo reverses your last tap. */

type Kind = 'door' | 'objection' | 'sale';
type Tap = { kind: Kind; objection?: string; note?: string }; // note: their words, for "Other"

const EMPTY: DoorTotals = { doors: 0, objections: 0, sales: 0, mix: {} };

function apply(t: DoorTotals, tap: Tap, d: 1 | -1): DoorTotals {
  const n = { ...t, mix: { ...t.mix } };
  if (tap.kind === 'door') n.doors = Math.max(0, n.doors + d);
  if (tap.kind === 'sale') n.sales = Math.max(0, n.sales + d);
  if (tap.kind === 'objection') {
    n.objections = Math.max(0, n.objections + d);
    if (tap.objection) n.mix[tap.objection] = Math.max(0, (n.mix[tap.objection] ?? 0) + d);
  }
  return n;
}

export function Tracker({ onSignIn }: { onSignIn: () => void }) {
  const { profile, loading } = useAuth();
  const [rep, setRep] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [today, setToday] = useState<DoorTotals>(EMPTY);
  const [week, setWeek] = useState<DoorTotals>(EMPTY);
  const [history, setHistory] = useState<Tap[]>([]);
  const [flash, setFlash] = useState<string>('');
  const [error, setError] = useState('');
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [recentOther, setRecentOther] = useState<string[]>([]); // their own recent "Other" answers, for one-tap reuse
  const day = useRef(ymd(new Date()));
  const flashTimer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    if (!supabase || !profile) return;
    const { data, error } = await supabase.rpc('my_rep');
    if (error) { setError(error.message); setRep(null); return; }
    const me = (data as { id: string; name: string }[] | null)?.[0] ?? null;
    setRep(me);
    if (!me) return;
    day.current = ymd(new Date());
    const from = ymd(weekStart());
    const { data: rows } = await supabase.from('door_counts').select('rep_id, day, doors, objections, sales, objection_mix')
      .eq('rep_id', me.id).gte('day', from).lte('day', ymd(addDays(new Date(), 1)));
    const all = (rows as DoorCount[]) ?? [];
    setToday(sumDoors(all.filter((r) => r.day === day.current)));
    setWeek(sumDoors(all));
    const { data: others } = await supabase.from('door_other_objections').select('objection').eq('rep_id', me.id)
      .order('created_at', { ascending: false }).limit(60);
    setRecentOther(dedupe(((others as { objection: string }[]) ?? []).map((o) => o.objection)).slice(0, 6));
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  // after midnight, start a fresh day
  useEffect(() => {
    const t = window.setInterval(() => { if (ymd(new Date()) !== day.current) { setHistory([]); load(); } }, 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const send = async (tap: Tap, d: 1 | -1) => {
    if (!supabase) return;
    // count it on screen right away; put it back if the save fails
    setToday((t) => apply(t, tap, d));
    setWeek((t) => apply(t, tap, d));
    try { navigator.vibrate?.(d > 0 ? 12 : [8, 40, 8]); } catch { /* not supported */ }
    const label = tap.kind === 'door' ? 'Door' : tap.kind === 'sale' ? 'Sale!' : tap.note ? `“${tap.note.length > 24 ? `${tap.note.slice(0, 24)}…` : tap.note}”` : objectionLabel(tap.objection ?? 'other');
    setFlash(d > 0 ? `+1 ${label}` : `Undid ${label.replace('!', '')}`);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(''), 1200);
    const { error } = await supabase.rpc('track', { p_kind: tap.kind, p_day: day.current, p_objection: tap.objection ?? null, p_delta: d, p_note: tap.note ?? null });
    if (error) {
      setToday((t) => apply(t, tap, d === 1 ? -1 : 1));
      setWeek((t) => apply(t, tap, d === 1 ? -1 : 1));
      if (d > 0) setHistory((h) => h.slice(0, -1));
      setError(`Didn't save: ${error.message}`);
    } else setError('');
  };

  const tap = (t: Tap) => { setHistory((h) => [...h, t].slice(-50)); send(t, 1); };
  const logOther = (words: string) => {
    const note = words.replace(/\s+/g, ' ').trim().slice(0, 120);
    tap({ kind: 'objection', objection: 'other', note: note || undefined });
    if (note) setRecentOther((r) => dedupe([note, ...r]).slice(0, 6));
    setOtherText('');
    setOtherOpen(false);
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    send(last, -1);
  };

  const shell = (body: React.ReactNode) => (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-6 text-ink">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-surface p-7 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-line bg-bg text-gold"><Lock className="h-5 w-5" strokeWidth={1.5} /></div>
        {body}
        <a href="#" className="mt-6 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-gold"><ArrowLeft className="h-4 w-4" /> Back to the site</a>
      </div>
    </div>
  );

  if (!isConfigured) return shell(<p className="text-sm text-ink-muted">Logins aren&apos;t connected yet.</p>);
  if (loading || (profile && rep === undefined)) return <div className="min-h-[100dvh] bg-bg" />;
  if (!profile) return shell(<>
    <h1 className="font-display text-3xl font-semibold tracking-[0.04em]">Door tracker</h1>
    <p className="mt-2 text-sm text-ink-muted">Log in with the email Braden or Peter have on file for you.</p>
    <button onClick={onSignIn} className="mt-5 w-full rounded-md bg-gold px-4 py-3 font-semibold text-on-gold">Log in</button>
  </>);
  if (!rep) return shell(<>
    <h1 className="font-display text-3xl font-semibold tracking-[0.04em]">Not set up yet</h1>
    <p className="mt-2 text-sm text-ink-muted">
      {error || <>You&apos;re logged in as <b className="text-ink">{profile.email}</b>, but there&apos;s no rep on file with that email. Ask Braden or Peter to add you as a rep with it.</>}
    </p>
  </>);

  const rate = closeRate(today);
  const first = rep.name.split(' ')[0];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg text-ink select-none [-webkit-tap-highlight-color:transparent]">
      <header className="flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <a href="#" aria-label="Back to the site" className="rounded-md p-1.5 text-ink-muted hover:text-gold"><ArrowLeft className="h-5 w-5" /></a>
        <Logo />
        <span className="ml-auto truncate text-sm text-ink-muted">{first} · today</span>
      </header>

      {/* today's numbers */}
      <section aria-label="Today" className="grid grid-cols-4 gap-2 px-4 pt-2">
        {([
          ['Doors', today.doors],
          ['Objections', today.objections],
          ['Sales', today.sales],
          ['Close', rate == null ? '—' : `${rate}%`],
        ] as const).map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-line bg-surface px-2 py-2.5 text-center">
            <div className="font-mono text-2xl tabular text-gold-glow" aria-live="polite">{v}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{k}</div>
          </div>
        ))}
      </section>
      <p className="px-4 pt-2 text-center font-mono text-[11px] text-ink-muted">
        This week: {week.doors} doors · {week.objections} objections · {week.sales} sales
      </p>

      <main className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <button
          onClick={() => tap({ kind: 'door' })}
          className="flex min-h-[132px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface text-ink transition active:scale-[0.98] active:border-gold active:bg-gold-soft"
        >
          <DoorClosed className="h-9 w-9 text-gold" strokeWidth={1.5} />
          <span className="font-display text-3xl font-semibold uppercase tracking-[0.06em]">Door</span>
          <span className="text-xs text-ink-muted">Tap at every door you knock</span>
        </button>

        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
            <ShieldAlert className="h-4 w-4 text-gold" /> Objection — tap what they said
          </div>
          <div className="grid grid-cols-2 gap-2">
            {OBJECTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => (o.id === 'other' ? setOtherOpen(true) : tap({ kind: 'objection', objection: o.id }))}
                className={`relative min-h-[48px] rounded-lg border border-line bg-bg px-2 text-sm font-semibold text-ink transition active:scale-[0.97] active:border-gold active:text-gold ${o.id === 'other' ? 'col-span-2' : ''}`}
              >
                {o.label}
                {(today.mix[o.id] ?? 0) > 0 && <span className="absolute right-2 top-1.5 font-mono text-[11px] text-gold">{today.mix[o.id]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={undo}
            disabled={!history.length}
            aria-label="Undo last tap"
            className="flex min-h-[72px] w-[30%] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface text-sm font-semibold text-ink-muted transition active:scale-[0.97] disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" /> Undo
          </button>
          <button
            onClick={() => tap({ kind: 'sale' })}
            className="flex min-h-[72px] flex-1 items-center justify-center gap-3 rounded-2xl bg-gold font-display text-2xl font-semibold uppercase tracking-[0.06em] text-on-gold transition active:scale-[0.98] active:bg-gold-deep"
          >
            <Handshake className="h-7 w-7" strokeWidth={1.75} /> Sale
          </button>
        </div>
      </main>

      {/* "Other": what did they actually say? */}
      {otherOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setOtherOpen(false)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Other objection"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); if (otherText.trim()) logOther(otherText); }}
            className="w-full rounded-t-2xl border-t border-line bg-surface p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            <div className="mb-3 flex items-center">
              <h2 className="font-display text-xl font-semibold uppercase tracking-[0.05em]">What did they say?</h2>
              <button type="button" aria-label="Close" onClick={() => setOtherOpen(false)} className="ml-auto rounded-md p-1.5 text-ink-muted"><X className="h-5 w-5" /></button>
            </div>
            {recentOther.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {recentOther.map((r) => (
                  <button key={r} type="button" onClick={() => logOther(r)} className="max-w-full truncate rounded-full border border-line bg-bg px-3 py-2 text-sm text-ink active:border-gold active:text-gold">
                    {r}
                  </button>
                ))}
              </div>
            )}
            <input
              autoFocus
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              maxLength={120}
              enterKeyHint="done"
              placeholder="e.g. Already signed with a competitor"
              aria-label="Their objection, in their words"
              className="w-full rounded-lg border border-line bg-bg px-3 py-3 text-base text-ink placeholder:text-ink-muted/60 focus:border-gold focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => logOther('')} className="min-h-[48px] flex-1 rounded-lg border border-line text-sm font-semibold text-ink-muted">Just log “Other”</button>
              <button type="submit" disabled={!otherText.trim()} className="min-h-[48px] flex-[1.4] rounded-lg bg-gold text-sm font-semibold text-on-gold disabled:opacity-40">Save objection</button>
            </div>
          </form>
        </div>
      )}

      {/* tap confirmation + errors */}
      <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-[200px] flex justify-center px-4">
        {error ? (
          <div className="rounded-full border border-[#d9705f] bg-bg px-4 py-2 text-sm font-semibold text-[#d9705f] shadow-lg">{error}</div>
        ) : flash ? (
          <div className="rounded-full bg-gold px-4 py-2 font-mono text-sm font-semibold text-on-gold shadow-lg">{flash}</div>
        ) : null}
      </div>
    </div>
  );
}

function dedupe(list: string[]) {
  const seen = new Set<string>();
  return list.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
