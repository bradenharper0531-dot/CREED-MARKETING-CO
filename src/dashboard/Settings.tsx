import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';
import { PageHead } from './Dashboard.tsx';
import { shortDate } from './dates.ts';
import { btn, Card, ErrorNote, input, Loading, Pill } from './ui.tsx';

type Person = { id: string; email: string; full_name: string | null; role: 'owner' | 'rep'; created_at: string };

export function Settings() {
  const { profile } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [allow, setAllow] = useState<string[]>([]);
  const [samples, setSamples] = useState(0);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase) return;
    const [p, o, s1, s2] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, created_at').order('created_at'),
      supabase.from('owner_emails').select('email').order('email'),
      supabase.from('reps').select('id', { count: 'exact', head: true }).eq('is_sample', true),
      supabase.from('recruits').select('id', { count: 'exact', head: true }).eq('is_sample', true),
    ]);
    if (p.error) setError(p.error.message);
    setPeople((p.data as Person[]) ?? []);
    setAllow(((o.data as { email: string }[]) ?? []).map((x) => x.email));
    setSamples((s1.count ?? 0) + (s2.count ?? 0));
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
                    <td><Pill tone={u.role === 'owner' ? 'progress' : 'new'}>{u.role === 'owner' ? 'Owner' : 'Rep'}</Pill></td>
                    <td className="text-right">
                      {u.id === profile?.id ? (
                        <span className="text-xs text-ink-muted">You</span>
                      ) : (
                        <button
                          className={btn}
                          onClick={() => {
                            const to = u.role === 'owner' ? 'rep' : 'owner';
                            if (!confirm(to === 'owner' ? `Make ${u.email} an owner? They'll see margins, all reps and the pipeline.` : `Remove owner access from ${u.email}?`)) return;
                            run(() => sb.from('profiles').update({ role: to }).eq('id', u.id));
                          }}
                        >
                          {u.role === 'owner' ? 'Make rep' : 'Make owner'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card tag="Owner allowlist" title="Who becomes an owner on sign-up">
          <div className="space-y-4 p-4">
            <p className="text-sm text-ink-muted">Anyone who signs up with one of these emails is an owner automatically. Adding an email also promotes an existing account with it. Everyone else signs up as a rep.</p>
            <div className="flex flex-wrap gap-2">
              {allow.map((e) => (
                <span key={e} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs text-ink">
                  {e}
                  <button aria-label={`Remove ${e}`} className="text-ink-muted hover:text-[#d9705f] cursor-pointer" onClick={() => run(() => sb.from('owner_emails').delete().eq('email', e))}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = email.trim().toLowerCase();
                if (!v.includes('@')) return;
                setEmail('');
                run(() => sb.from('owner_emails').upsert({ email: v }));
              }}
            >
              <input type="email" required placeholder="email@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              <button className={btn}>Add</button>
            </form>
          </div>
        </Card>

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
