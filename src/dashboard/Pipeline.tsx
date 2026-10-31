import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Plus, Phone, Mail, AtSign } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { PageHead } from './Dashboard.tsx';
import { STAGES, stageTone, PILLAR_LABEL, type Note, type Recruit, type Stage, type OwnerName } from './types.ts';
import { dateTime, shortDate, ymd } from './dates.ts';
import { useActor } from './useOwner.ts';
import { btn, btnDanger, btnGold, ChipButton, Empty, ErrorNote, Field, IndTag, input, Loading, Panel, Pill, SampleTag, Thread, TONE } from './ui.tsx';

const CLOSED: Stage[] = ['signed', 'cold', 'not_fit'];
const isOverdue = (r: Recruit) => !!r.next_follow_up && r.next_follow_up < ymd(new Date()) && !CLOSED.includes(r.stage);

export function Pipeline() {
  const actor = useActor();
  const [items, setItems] = useState<Recruit[] | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<'board' | 'table'>('board');
  const [owner, setOwner] = useState<'all' | OwnerName>('all');
  const [showSide, setShowSide] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [open, setOpen] = useState<string | 'new' | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [r, n, m] = await Promise.all([
      supabase.from('recruits').select('*').order('last_touch', { ascending: false }),
      supabase.from('recruit_notes').select('id, recruit_id, author_name, body, created_at').order('created_at', { ascending: false }).limit(3000),
      supabase.from('markets').select('name').order('sort'),
    ]);
    if (r.error) setError(r.error.message);
    setItems((r.data as Recruit[]) ?? []);
    setNotes((n.data as Note[]) ?? []);
    setMarkets(((m.data as { name: string }[]) ?? []).map((x) => x.name));
  }, []);

  // load now, and again whenever you come back to the tab — new applications show up
  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const latest = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of notes) if (n.recruit_id && !m.has(n.recruit_id)) m.set(n.recruit_id, n);
    return m;
  }, [notes]);

  if (!items) return <Loading />;

  const shown = items.filter((r) => owner === 'all' || r.owner_name === owner);
  const overdue = shown.filter(isOverdue).length;
  const newCount = shown.filter((r) => r.stage === 'new').length;
  const sideCount = shown.filter((r) => r.stage === 'cold' || r.stage === 'not_fit').length;
  const cols = STAGES.filter((s) => !s.side || showSide);

  async function move(id: string, stage: Stage) {
    const r = items!.find((x) => x.id === id);
    if (!r || r.stage === stage || !supabase) return;
    const now = new Date().toISOString();
    const patch: Partial<Recruit> = { stage, last_touch: now, ...(stage === 'signed' ? { signed_at: now } : {}) };
    setItems((xs) => xs!.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('recruits').update(patch).eq('id', id);
    if (error) {
      setError(error.message);
      load();
    } else if (stage === 'signed') setOpen(id);
  }

  return (
    <>
      <PageHead
        tag="Pipeline"
        title="Who's coming in."
        sub="Every application from the site lands here as a New lead. Drag cards between stages, or use the dropdown on each card."
        right={<button className={btnGold} onClick={() => setOpen('new')}><Plus className="h-4 w-4" /> Add recruit</button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="View">
          {(['board', 'table'] as const).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}
              className={`rounded-full px-4 py-1 text-sm font-semibold capitalize cursor-pointer ${view === v ? 'bg-gold text-on-gold' : 'text-ink-muted hover:text-ink'}`}>
              {v}
            </button>
          ))}
        </div>
        <span className="mx-1 h-6 w-px bg-line" />
        {(['all', 'Braden', 'Peter'] as const).map((o) => (
          <ChipButton key={o} on={owner === o} onClick={() => setOwner(o)}>{o === 'all' ? "Everyone's" : `${o}'s`}</ChipButton>
        ))}
        <span className="mx-1 h-6 w-px bg-line" />
        <ChipButton on={showSide} onClick={() => setShowSide((s) => !s)}>
          {showSide ? 'Hide' : 'Show'} went cold / not a fit <span className="font-mono text-xs opacity-70">{sideCount}</span>
        </ChipButton>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {newCount > 0 && <span className="font-semibold text-gold">{newCount} new</span>}
          {overdue > 0 && <span className="font-semibold text-[#d9705f]">{overdue} follow-up{overdue > 1 ? 's' : ''} overdue</span>}
          <button onClick={load} className={btn} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      {view === 'board' ? (
        <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col items-start gap-3 overflow-x-auto pb-3">
          {cols.map((c) => {
            const list = shown.filter((r) => r.stage === c.id);
            return (
              <section
                key={c.id}
                onDragOver={(e) => { e.preventDefault(); setOver(c.id); }}
                onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
                onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) move(id, c.id); }}
                className={`grid min-h-[320px] grid-rows-[auto_1fr] rounded-[10px] border transition-colors ${over === c.id ? 'border-gold bg-gold-soft' : 'border-line bg-surface'}`}
              >
                <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
                  <Pill tone={stageTone[c.id]}>{c.label}</Pill>
                  <span className="font-mono text-sm text-ink-muted">{list.length}</span>
                </div>
                <div className="grid content-start gap-2 p-2.5">
                  {list.length === 0 && <p className="p-2 text-xs text-ink-muted">Drop a card here.</p>}
                  {list.map((r) => {
                    const n = latest.get(r.id);
                    return (
                      <div
                        key={r.id}
                        draggable
                        role="button"
                        tabIndex={0}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', r.id); setDrag(r.id); }}
                        onDragEnd={() => setDrag(null)}
                        onClick={() => setOpen(r.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setOpen(r.id); }}
                        className={`grid cursor-grab gap-2 rounded-md border bg-bg p-3 text-left transition-colors hover:border-gold-deep ${drag === r.id ? 'border-gold opacity-60' : 'border-line'}`}
                      >
                        <div className="flex items-center gap-2 font-semibold">{r.name} {r.is_sample && <SampleTag />}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                          <IndTag industry={r.industry_interest} />
                          {r.preferred_market && <span>{r.preferred_market}</span>}
                          {r.pillar && <span>· {PILLAR_LABEL[r.pillar]}</span>}
                        </div>
                        {(r.start_date || r.has_car != null || r.has_license != null) && (
                          <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-ink-muted">
                            {r.start_date && <span>Starts {shortDate(r.start_date)}</span>}
                            {r.has_car != null && <span>· Car {r.has_car ? '✓' : '✗'}</span>}
                            {r.has_license != null && <span>· License {r.has_license ? '✓' : '✗'}</span>}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-ink-muted">
                          <span>{r.owner_name ?? 'Unassigned'}</span>
                          <span>· touched {shortDate(r.last_touch)}</span>
                          {r.next_follow_up && (
                            <span className={isOverdue(r) ? 'font-semibold text-[#d9705f]' : ''}>
                              · follow up {shortDate(r.next_follow_up)}{isOverdue(r) ? ' (overdue)' : ''}
                            </span>
                          )}
                        </div>
                        {n && <p className="truncate text-[13px] text-ink-muted">{n.body}</p>}
                        {/* keyboard / touch alternative to drag-and-drop */}
                        <select
                          aria-label={`Move ${r.name} to stage`}
                          value={r.stage}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => move(r.id, e.target.value as Stage)}
                          className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                        >
                          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
          {shown.length === 0 ? <div className="p-4"><Empty>No recruits yet.</Empty></div> : (
            <table className="w-full text-sm tabular">
              <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-semibold border-b border-line">
                  <th>Name</th><th>Stage</th><th>Phone</th><th>Interest</th><th>Market</th><th>Starts</th><th>Car / Lic.</th><th>Owner</th><th>Last touch</th><th>Follow up</th><th>Latest note</th>
                </tr>
              </thead>
              <tbody>
                {shown.filter((r) => showSide || !['cold', 'not_fit'].includes(r.stage)).map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r.id)} className="cursor-pointer border-b border-line hover:bg-surface-raised [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-2.5">
                    <td className="font-semibold">{r.name} {r.is_sample && <SampleTag />}</td>
                    <td><Pill tone={stageTone[r.stage]}>{STAGES.find((s) => s.id === r.stage)?.label}</Pill></td>
                    <td className="font-mono">{r.phone ?? '—'}</td>
                    <td><IndTag industry={r.industry_interest} /></td>
                    <td>{r.preferred_market ?? '—'}</td>
                    <td className="font-mono">{shortDate(r.start_date)}</td>
                    <td className="font-mono">{r.has_car == null ? '—' : r.has_car ? '✓' : '✗'} / {r.has_license == null ? '—' : r.has_license ? '✓' : '✗'}</td>
                    <td>{r.owner_name ?? '—'}</td>
                    <td className="font-mono">{shortDate(r.last_touch)}</td>
                    <td className={`font-mono ${isOverdue(r) ? 'text-[#d9705f]' : ''}`}>{shortDate(r.next_follow_up)}</td>
                    <td className="max-w-[280px] overflow-hidden text-ellipsis text-ink-muted">{latest.get(r.id)?.body ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {open && (
        <RecruitPanel
          recruit={open === 'new' ? null : items.find((r) => r.id === open) ?? null}
          notes={open === 'new' ? [] : notes.filter((n) => n.recruit_id === open)}
          markets={markets}
          actor={actor}
          onNote={(n) => setNotes((xs) => [n, ...xs])}
          onMove={move}
          onSaved={load}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function RecruitPanel({ recruit: r, notes, markets, actor, onNote, onMove, onSaved, onClose }: {
  recruit: Recruit | null;
  notes: Note[];
  markets: string[];
  actor: { id: string | null; name: string };
  onNote: (n: Note) => void;
  onMove: (id: string, s: Stage) => void;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [converted, setConverted] = useState(false);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!r || !text.trim() || !supabase) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('recruit_notes')
      .insert({ recruit_id: r.id, body: text.trim().slice(0, 2000), author_id: actor.id, author_name: actor.name })
      .select('id, recruit_id, author_name, body, created_at')
      .single();
    setBusy(false);
    if (error) return setErr(error.message);
    onNote(data as Note);
    setText('');
    await supabase.from('recruits').update({ last_touch: new Date().toISOString() }).eq('id', r.id);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const s = (k: string, max = 200) => { const v = String(fd.get(k) ?? '').trim().slice(0, max); return v || null; };
    const yn = (k: string) => (fd.get(k) === 'yes' ? true : fd.get(k) === 'no' ? false : null);
    const owner = s('owner_name');
    const row = {
      name: s('name', 120) ?? 'Unnamed',
      phone: s('phone', 40),
      email: s('email', 160)?.toLowerCase() ?? null,
      instagram: s('instagram', 60),
      industry_interest: (['fiber', 'pest', 'either'].includes(String(fd.get('industry_interest'))) ? fd.get('industry_interest') : 'either') as string,
      preferred_market: s('preferred_market', 60),
      pillar: (['physical', 'spiritual', 'mental', 'financial'].includes(String(fd.get('pillar'))) ? fd.get('pillar') : null) as string | null,
      owner_name: owner === 'Braden' || owner === 'Peter' ? owner : null,
      next_follow_up: s('next_follow_up', 10),
      start_date: s('start_date', 10),
      has_car: yn('has_car'),
      has_license: yn('has_license'),
      source: s('source', 120),
    };
    setBusy(true);
    setErr('');
    const { error } = r ? await supabase.from('recruits').update(row).eq('id', r.id) : await supabase.from('recruits').insert({ ...row, stage: 'new' });
    setBusy(false);
    if (error) return setErr(error.message);
    onSaved();
    if (r) setMsg('Saved.');
    else onClose();
  }

  async function remove() {
    if (!r || !supabase || !confirm(`Delete ${r.name} from the pipeline?`)) return;
    const { error } = await supabase.from('recruits').delete().eq('id', r.id);
    if (error) return setErr(error.message);
    onSaved();
    onClose();
  }

  /* Signed recruit → rep record (name, phone, email, market, who recruited them, and their login if they have one) */
  async function convert(industry: 'fiber' | 'pest') {
    if (!r || !supabase) return;
    setBusy(true);
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('markets').select('id').eq('name', r.preferred_market ?? '').maybeSingle(),
      r.email ? supabase.from('profiles').select('id').eq('email', r.email.toLowerCase()).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const { error } = await supabase.from('reps').insert({
      name: r.name, phone: r.phone, email: r.email, industry, market_id: m?.id ?? null,
      recruited_by: r.owner_name, profile_id: (p as { id: string } | null)?.id ?? null, status: 'active', start_date: r.start_date ?? ymd(new Date()),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setConverted(true);
  }

  const sel = (v: boolean | null) => (v == null ? '' : v ? 'yes' : 'no');

  return (
    <Panel
      title={r ? r.name : 'Add recruit'}
      badge={r ? <Pill tone={stageTone[r.stage]}>{STAGES.find((s) => s.id === r.stage)?.label}</Pill> : undefined}
      onClose={onClose}
    >
      {r && (
        <div className="flex flex-wrap gap-2">
          {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className={btnGold}><Phone className="h-4 w-4" /> Call</a>}
          {r.phone && <a href={`sms:${r.phone.replace(/[^\d+]/g, '')}`} className={btn}>Text</a>}
          {r.email && <a href={`mailto:${r.email}`} className={btn}><Mail className="h-4 w-4" /> Email</a>}
          {r.instagram && <a href={`https://instagram.com/${r.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className={btn}><AtSign className="h-4 w-4" /> Instagram</a>}
        </div>
      )}

      {r?.stage === 'signed' && !converted && (
        <div className="space-y-2 rounded-[10px] border bg-well p-4" style={{ borderColor: TONE.signed }}>
          <p className="font-semibold" style={{ color: TONE.signed }}>Signed. Create a rep record for {r.name.split(' ')[0]}?</p>
          <p className="text-[13px] text-ink-muted">Copies name, phone, email, market, start date and who recruited them into Reps.</p>
          <div className="flex gap-2">
            <button className={btn} disabled={busy} onClick={() => convert('fiber')}>Create fiber rep</button>
            <button className={btn} disabled={busy} onClick={() => convert('pest')}>Create pest control rep</button>
          </div>
        </div>
      )}
      {converted && <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: TONE.signed, color: TONE.signed }}>Rep created. Find them under Reps.</p>}

      {r && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">Where they&apos;re at</h3>
          <form onSubmit={addNote} className="mb-3 space-y-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={`${input} resize-y`}
              placeholder="e.g. Called him — wants to start after finals, talking to his parents this week." />
            <button className={btnGold} disabled={busy || !text.trim()}>Add update as {actor.name}</button>
          </form>
          <Thread notes={notes} empty="No updates yet." />
        </section>
      )}

      <form onSubmit={save} className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">Details</h3>
        <Field label="Name"><input name="name" defaultValue={r?.name} required className={input} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Phone"><input name="phone" defaultValue={r?.phone ?? ''} className={input} /></Field>
          <Field label="Email"><input name="email" type="email" defaultValue={r?.email ?? ''} className={input} /></Field>
          <Field label="Instagram"><input name="instagram" defaultValue={r?.instagram ?? ''} className={input} /></Field>
          <Field label="Interest">
            <select name="industry_interest" defaultValue={r?.industry_interest ?? 'either'} className={input}>
              <option value="fiber">Fiber</option><option value="pest">Pest control</option><option value="either">Either</option>
            </select>
          </Field>
          <Field label="Target market">
            <select name="preferred_market" defaultValue={r?.preferred_market ?? ''} className={input}>
              <option value="">—</option>
              {[...new Set([...(r?.preferred_market ? [r.preferred_market] : []), ...markets])].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Pillar">
            <select name="pillar" defaultValue={r?.pillar ?? ''} className={input}>
              <option value="">—</option>
              {Object.entries(PILLAR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Available to start"><input name="start_date" type="date" defaultValue={r?.start_date ?? ''} className={`${input} font-mono`} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Car">
              <select name="has_car" defaultValue={sel(r?.has_car ?? null)} className={input}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select>
            </Field>
            <Field label="License">
              <select name="has_license" defaultValue={sel(r?.has_license ?? null)} className={input}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select>
            </Field>
          </div>
          <Field label="Owner">
            <select name="owner_name" defaultValue={r?.owner_name ?? ''} className={input}>
              <option value="">Unassigned</option><option>Braden</option><option>Peter</option>
            </select>
          </Field>
          <Field label="Next follow-up"><input name="next_follow_up" type="date" defaultValue={r?.next_follow_up ?? ''} className={`${input} font-mono`} /></Field>
        </div>
        <Field label="How they heard about us"><input name="source" defaultValue={r?.source ?? ''} className={input} /></Field>
        {r && (
          <Field label="Stage">
            <select value={r.stage} onChange={(e) => onMove(r.id, e.target.value as Stage)} className={input}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        )}
        {err && <ErrorNote message={err} />}
        <div className="flex items-center gap-3">
          <button className={btnGold} disabled={busy}>{busy ? 'Saving…' : r ? 'Save details' : 'Add recruit'}</button>
          {msg && <span className="text-sm" style={{ color: TONE.signed }}>{msg}</span>}
          {r && <button type="button" onClick={remove} className={btnDanger}>Delete</button>}
        </div>
      </form>
      {r && <p className="font-mono text-xs text-ink-muted">Applied {dateTime(r.created_at)}{r.source ? ` · via ${r.source}` : ''}</p>}
    </Panel>
  );
}
