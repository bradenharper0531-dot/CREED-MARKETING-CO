import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Tone } from './types.ts';

/* Status colours differ by lightness as well as hue, and always ship with a label. */
export const TONE: Record<Tone, string> = {
  new: '#c9c2b0',
  progress: '#f5c518',
  signed: '#7ad19a',
  lost: '#d9705f',
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-raised px-2.5 py-1 text-xs font-semibold" style={{ color: TONE[tone] }}>
      <span className="h-2 w-2 rounded-full" style={{ background: TONE[tone] }} />
      {children}
    </span>
  );
}

export function IndTag({ industry }: { industry: 'fiber' | 'pest' | 'either' | 'starlink' | null }) {
  if (!industry) return null;
  const map = {
    fiber: ['FIBER', 'text-gold bg-gold-soft'],
    pest: ['PEST', 'text-bronze bg-[#2a1d12]'],
    either: ['EITHER', 'text-ink-muted bg-surface-raised'],
    starlink: ['STARLINK', 'text-ink-muted bg-surface-raised'],
  } as const;
  const [label, cls] = map[industry];
  return <span className={`rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em] ${cls}`}>{label}</span>;
}

export function SampleTag() {
  return <span className="rounded-[4px] border border-dashed border-line px-1.5 py-px font-mono text-[10px] uppercase text-ink-muted">sample</span>;
}

export function Card({ tag, title, right, children, className = '' }: { tag?: string; title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-line bg-surface ${className}`}>
      {(tag || title || right) && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3">
          {tag && <span className="rounded-[4px] bg-gold-soft px-[7px] py-0.5 font-mono text-[11px] tracking-[0.04em] text-gold">{tag}</span>}
          {title && <h2 className="font-display text-lg font-semibold tracking-[0.04em] text-ink">{title}</h2>}
          {right && <div className="ml-auto">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ k, v, sub, big }: { k: string; v: React.ReactNode; sub?: React.ReactNode; big?: boolean }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-[10px] border border-line bg-well px-4 py-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gold-dim">{k}</span>
      <span className={`font-mono tabular text-gold-glow ${big ? 'text-[30px]' : 'text-[26px]'} leading-tight`}>{v}</span>
      {sub && <span className="font-mono text-xs">{sub}</span>}
    </div>
  );
}

export function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev && !now) return <span className="text-ink-muted">—</span>;
  if (!prev) return <span className="text-[#7ad19a]">▲ new</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  return <span className={pct >= 0 ? 'text-[#7ad19a]' : 'text-[#d9705f]'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs. previous</span>;
}

export function ChipButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
        on ? 'border-gold-deep bg-gold-soft text-gold' : 'border-line text-ink-muted hover:border-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export const btn = 'inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink hover:border-gold hover:text-gold transition-colors cursor-pointer disabled:opacity-50';
export const btnGold = 'inline-flex items-center justify-center gap-2 rounded-md bg-gold px-3.5 py-2 text-sm font-semibold text-on-gold hover:bg-gold-glow active:bg-gold-deep transition-colors cursor-pointer disabled:opacity-50';
export const btnDanger = 'ml-auto rounded-md px-3 py-2 text-sm font-semibold text-[#d9705f] hover:bg-[#d9705f]/10 cursor-pointer';
export const input = 'w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-2 focus:outline-offset-1 focus:outline-gold focus:border-transparent';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">{label}</span>
      {children}
      {hint && <small className="text-xs text-ink-muted">{hint}</small>}
    </label>
  );
}

/* Slide-out panel from the right. Closes on ×, backdrop click or Escape. */
export function Panel({ title, badge, actions, onClose, children }: { title: string; badge?: React.ReactNode; actions?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', k);
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={title} className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[560px] flex-col border-l border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="min-w-0 flex-1 truncate font-display text-xl font-semibold tracking-[0.04em] text-ink">{title}</h2>
          {badge}
          {actions}
          <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1 text-ink-muted hover:text-gold cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
      </aside>
    </>
  );
}

export function Thread({ notes, empty = 'No notes yet.' }: { notes: { id: string; author_name: string | null; body: string; created_at: string }[]; empty?: string }) {
  if (!notes.length) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <div className="space-y-2.5">
      {notes.map((n) => (
        <div key={n.id} className="rounded-md border border-line bg-bg px-3 py-2.5">
          <div className="mb-1 flex gap-2 text-xs text-ink-muted">
            <b className="font-semibold text-gold">{n.author_name ?? '—'}</b>
            <span className="font-mono">
              {n.created_at && !Number.isNaN(Date.parse(n.created_at))
                ? new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : 'just now'}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink">{n.body}</p>
        </div>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[10px] border border-dashed border-line p-8 text-center text-sm text-ink-muted">{children}</div>;
}

export function Loading() {
  return <div className="py-16 text-center font-mono text-sm text-ink-muted">Loading…</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="rounded-md border border-[#d9705f] px-3 py-2 text-sm text-[#d9705f]">{message}</p>;
}
