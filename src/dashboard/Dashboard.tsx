import React from 'react';
import { ArrowLeft, LayoutDashboard, KanbanSquare, Users, BadgeDollarSign, Settings as Gear, Lock, LogOut } from 'lucide-react';
import { Logo } from '../components/Logo.tsx';
import { useAuth, initials } from '../lib/auth.tsx';
import { isConfigured } from '../lib/supabase.ts';
import { DASH } from '../lib/route.ts';
import { Overview } from './Overview.tsx';
import { Pipeline } from './Pipeline.tsx';
import { Reps } from './Reps.tsx';
import { Rates } from './Rates.tsx';
import { Settings } from './Settings.tsx';
import { btnGold, Loading } from './ui.tsx';

const TABS = [
  { id: '', label: 'Overview', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'reps', label: 'Reps', icon: Users },
  { id: 'rates', label: 'Contract rates', icon: BadgeDollarSign },
  { id: 'settings', label: 'Settings', icon: Gear },
] as const;

/* The owner dashboard. Everything here reads and writes owner-only tables;
   the database refuses those rows to anyone who isn't an owner, so this gate
   is for a clean experience — the real lock is row-level security. */
export function Dashboard({ hash, onSignIn }: { hash: string; onSignIn: () => void }) {
  const { profile, loading, signOut } = useAuth();
  const tab = hash.replace(DASH, '').replace(/^\//, '').split(/[/?]/)[0];

  const gate = (title: string, body: React.ReactNode, action?: React.ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-ink">
      <div className="w-full max-w-md rounded-[10px] border border-line bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-line bg-bg text-gold">
          <Lock className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-[0.04em]">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {action}
          <a href="#" className="inline-flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-sm font-semibold text-ink hover:border-gold hover:text-gold">
            <ArrowLeft className="h-4 w-4" /> Back to the site
          </a>
        </div>
      </div>
    </div>
  );

  if (!isConfigured) return gate('Owner dashboard', <>Logins aren&apos;t connected yet. Add the Supabase keys to <span className="font-mono">.env</span> (see README).</>);
  if (loading) return <div className="min-h-screen bg-bg"><Loading /></div>;
  if (!profile) return gate('Owners only', 'Log in with an owner account to open the dashboard.', <button className={btnGold} onClick={onSignIn}>Log in</button>);
  if (profile.role !== 'owner') return gate('Owners only', `You're logged in as ${profile.email}, which is a rep account. The dashboard is for Creed's owners.`);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-8">
          <a href="#" className="group flex items-center" aria-label="Creed — back to the site">
            <Logo />
          </a>
          <span className="hidden rounded-[4px] bg-gold px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-on-gold sm:inline">Owner</span>
          <div className="ml-auto flex items-center gap-2">
            <a href="#" className="hidden items-center gap-1.5 text-sm text-ink-muted hover:text-gold sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Site
            </a>
            <span title={profile.email} className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-gold-deep font-mono text-xs text-gold">
              {initials(profile.fullName || profile.email)}
            </span>
            <button onClick={signOut} aria-label="Log out" className="rounded-md p-2 text-ink-muted hover:text-gold cursor-pointer">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav aria-label="Dashboard" className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 sm:px-8">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <a
                key={t.id}
                href={t.id ? `${DASH}/${t.id}` : DASH}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'border-gold text-gold' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </a>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
        {tab === 'pipeline' ? <Pipeline /> : tab === 'reps' ? <Reps /> : tab === 'rates' ? <Rates /> : tab === 'settings' ? <Settings /> : <Overview />}
      </main>
    </div>
  );
}

export function PageHead({ tag, title, sub, right }: { tag: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="rounded-[4px] bg-gold-soft px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-gold">{tag}</span>
        <h1 className="mt-3 font-display text-display-xs font-semibold text-ink">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm text-ink-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
