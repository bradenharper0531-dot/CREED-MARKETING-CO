import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { useAuth, ROLE_LABEL, type Role } from '../lib/auth.tsx';
import { DASH } from '../lib/route.ts';
import { PageHead } from './Dashboard.tsx';
import { shortDate } from './dates.ts';
import { btn, Card, ErrorNote, input, Loading, Pill } from './ui.tsx';

type Person = { id: string; email: string; full_name: string | null; role: Role; created_at: string };

const ROLE_NOTE: Record<Role, string> = {
  owner: "They'll see margins, contract rates, every rep's numbers, the pipeline and Settings.",
  lead: "They'll see the recruiting pipeline, plus an Overview of their own reps if you turn it on. No rates or margins.",
  rep: 'They\'ll see the public site and their own growth plan.',
};

export function Settings() {
  const { profile } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [allow, setAllow] = useState<string[]>([]);
  const [leads, setLeads] = useState<string[]>([]);
  const [samples, setSamples] = useState(0);
  const [overview, setOverview] = useState<Set<string> | null>(null); // team leads with Overview on
  const [teamSize, setTeamSize] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase) return;
    const [p, o, l, s1, s2, ov, tm] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, created_at').order('created_at'),
      supabase.from('owner_emails').select('email').order('email'),
      supabase.from('lead_emails').select('email').order('email'),
      supabase.from('reps').select('id', { count: 'exact', head: true }).eq('is_sample', true),
      supabase.from('recruits').select('id', { count: 'exact', head: true }).eq('is_sample', true),
      supabase.from('lead_overview').select('lead_id'),
      supabase.from('reps').select('lead_id').eq('status', 'active').not('lead_id', 'is', null),
    ]);
    if (p.error) setError(p.error.message);
    setPeople((p.data as Person[]) ?? []);
    setAllow(((o.data as { email: string }[]) ?? []).map((x) => x.email));
    if (l.error) setError(`Team leads aren't set up in the database yet — run supabase/team-leads.sql (see README). (${l.error.message})`);
    setLeads(((l.data as { email: string }[]) ?? []).map((x) => x.email));
    setSamples((s1.count ?? 0) + (s2.count ?? 0));
    // null = team overviews aren't set up in the database yet (supabase/team-overview.sql)
    setOverview(ov.error ? null : new Set(((ov.data as { lead_id: string }[]) ?? []).map((x) => x.lead_id)));
    const counts = new Map<string, number>();
    for (const r of (tm.data as { lead_id: string }[]) ?? []) counts.set(r.lead_id, (counts.get(r.lead_id) ?? 0) + 1);
    setTeamSize(counts);
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError('');
    const { error } = await fn();
    if (error) setError(error.message);
    load();
  };

  if (!people || !supabase) return <Loading />;
  const sb = supabase;

  return (
    <>
      <PageHead tag="Settings" title="Accounts & roles." />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}
      <div className="space-y-6">
        <Card tag="Users" title="Everyone with a login" right={<span className="font-mono text-xs text-ink-muted">{people.length}</span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                <tr className="border-b border-line [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold"><th>Name</th><th>Email</th><th>Joined</th><th>Role</th><th /></tr>
              </thead>
              <tbody>
                {people.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0 [&>td]:px-4 [&>td]:py-2.5">
                    <td className="font-semibold">{u.full_name ?? '—'}</td>
                    <td>{u.email}</td>
                    <td className="font-mono">{shortDate(u.created_at)}</td>
                    <td><Pill tone={u.role === 'owner' ? 'progress' : u.role === 'lead' ? 'signed' : 'new'}>{ROLE_LABEL[u.role]}</Pill></td>
                    <td className="text-right">
                      {u.id === profile?.id ? (
                        <span className="text-xs text-ink-muted">You</span>
                      ) : (
                        <select
                          aria-label={`Role for ${u.email}`}
                          value={u.role}
                          className={`${input} w-auto`}
                          onChange={(e) => {
                            const to = e.target.value as Role;
                            if (!confirm(`Make ${u.email} ${to === 'owner' ? 'an owner' : to === 'lead' ? 'a team lead' : 'a rep'}? ${ROLE_NOTE[to]}`)) return;
                            run(() => sb.from('profiles').update({ role: to }).eq('id', u.id));
                          }}
                        >
                          <option value="rep">Rep</option>
                          <option value="lead">Team lead</option>
                          <option value="owner">Owner</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card tag="Team overview" title="Team leads' own Overview" right={<span className="font-mono text-xs text-ink-muted">{people.filter((u) => u.role === 'lead').length}</span>}>
          <div className="space-y-4 p-4">
            <p className="max-w-3xl text-sm text-ink-muted">
              Turn this on and that team lead gets an <b className="text-ink">Overview</b> tab for the reps under them: sales, installs, connect rate, the weekly
              chart and their team leaderboard. Only their own reps, read-only, and never contract rates, margins or override money. Put a rep under a team lead
              from <a href={`${DASH}/reps`} className="text-gold hover:text-gold-glow">Reps</a> → the rep → Edit → Team lead.
            </p>
            {overview === null ? (
              <p className="text-sm text-ink-muted">Not set up in the database yet — run <span className="font-mono">supabase/team-overview.sql</span> (see README).</p>
            ) : people.filter((u) => u.role === 'lead').length === 0 ? (
              <p className="text-sm text-ink-muted">No team leads yet. Add one in the Team leads list below.</p>
            ) : (
              <div className="divide-y divide-line rounded-md border border-line">
                {people.filter((u) => u.role === 'lead').map((u) => {
                  const on = overview.has(u.id);
                  const n = teamSize.get(u.id) ?? 0;
                  return (
                    <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{u.full_name ?? u.email}</div>
                        <div className="text-xs text-ink-muted">{u.email} · <span className="font-mono">{n}</span> active rep{n === 1 ? '' : 's'} under them</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`Overview for ${u.full_name ?? u.email}`}
                        onClick={() => run(() => (on ? sb.from('lead_overview').delete().eq('lead_id', u.id) : sb.from('lead_overview').insert({ lead_id: u.id })))}
                        className={`inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${on ? 'border-gold-deep bg-gold-soft text-gold' : 'border-line text-ink-muted hover:text-ink'}`}
                      >
                        <span className={`relative h-4 w-7 rounded-full transition-colors ${on ? 'bg-gold' : 'bg-line'}`}>
                          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-bg transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
                        </span>
                        Overview {on ? 'on' : 'off'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <EmailList
          tag="Team leads"
          title="Who's a team lead"
          body="Add someone's email to make them a team lead. They'll see the recruiting pipeline (every lead, notes, follow-ups) and, if you turn it on above, an Overview of the reps under them. Never rates or margins. If they already have an account it switches right away; if not, they become a team lead when they sign up with this email. Removing an email turns them back into a rep."
          emails={leads}
          onAdd={(v) => run(() => sb.from('lead_emails').upsert({ email: v }))}
          onRemove={(v) => run(() => sb.from('lead_emails').delete().eq('email', v))}
        />

        <EmailList
          tag="Owner allowlist"
          title="Who becomes an owner on sign-up"
          body="Anyone who signs up with one of these emails is an owner automatically. Adding an email also promotes an existing account with it. Everyone else signs up as a rep (or a team lead, if they're on the list above)."
          emails={allow}
          onAdd={(v) => run(() => sb.from('owner_emails').upsert({ email: v }))}
          onRemove={(v) => run(() => sb.from('owner_emails').delete().eq('email', v))}
        />

        <Card tag="Sample data" title="Starter records">
          <div className="space-y-3 p-4">
            <p className="text-sm text-ink-muted">
              {samples ? `${samples} sample reps and recruits are loaded so every screen has something on it. Remove them once your real data is in.` : 'No sample data left.'}
            </p>
            {samples > 0 && (
              <button
                className={btn}
                onClick={() => {
                  if (!confirm('Delete all sample reps and recruits?')) return;
                  run(async () => {
                    const a = await sb.from('reps').delete().eq('is_sample', true);
                    if (a.error) return a;
                    return sb.from('recruits').delete().eq('is_sample', true);
                  });
                }}
              >
                Remove sample data
              </button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function EmailList({ tag, title, body, emails, onAdd, onRemove }: {
  tag: string; title: string; body: string; emails: string[];
  onAdd: (email: string) => void; onRemove: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  return (
    <Card tag={tag} title={title} right={<span className="font-mono text-xs text-ink-muted">{emails.length}</span>}>
      <div className="space-y-4 p-4">
        <p className="max-w-3xl text-sm text-ink-muted">{body}</p>
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {emails.map((e) => (
              <span key={e} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs text-ink">
                {e}
                <button aria-label={`Remove ${e}`} className="text-ink-muted hover:text-[#d9705f] cursor-pointer" onClick={() => onRemove(e)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = email.trim().toLowerCase();
            if (!v.includes('@')) return;
            setEmail('');
            onAdd(v);
          }}
        >
          <input type="email" required aria-label={`Add to ${tag}`} placeholder="email@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          <button className={btn}>Add</button>
        </form>
      </div>
    </Card>
  );
}
