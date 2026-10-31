import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { PageHead } from './Dashboard.tsx';
import { FilterBar } from './FilterBar.tsx';
import { buildRows, DEFAULT_FILTERS, useRepData, type Filters, type RepRow } from './repData.ts';
import { shortDate, ymd } from './dates.ts';
import { DailyBars, Sparkline } from './charts.tsx';
import { useActor } from './useOwner.ts';
import type { MarketRow, Note, RepStat } from './types.ts';
import { btn, btnDanger, btnGold, Empty, ErrorNote, Field, IndTag, input, Loading, Panel, Pill, SampleTag, Stat, Thread, TONE } from './ui.tsx';
import { initials } from '../lib/auth.tsx';

type Key = 'name' | 'industry' | 'marketName' | 'recruited_by' | 'start_date' | 'today' | 'week' | 'month' | 'season' | 'rangeInstalls' | 'connect';
const COLS: { k: Key; l: string; num?: boolean }[] = [
  { k: 'name', l: 'Rep' }, { k: 'industry', l: 'Industry' }, { k: 'marketName', l: 'Market' }, { k: 'recruited_by', l: 'Recruited by' },
  { k: 'start_date', l: 'Start' }, { k: 'today', l: 'Today', num: true }, { k: 'week', l: 'Week', num: true }, { k: 'month', l: 'Month', num: true },
  { k: 'season', l: 'Season', num: true }, { k: 'rangeInstalls', l: 'Installs', num: true }, { k: 'connect', l: 'Connect', num: true },
];

export function Reps() {
  const { reps, markets, stats, error, reload } = useRepData();
  const [f, setF] = useState<Filters>(DEFAULT_FILTERS);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: 'month', dir: -1 });
  const [open, setOpen] = useState<string | 'new' | null>(null);
  const [importing, setImporting] = useState(false);

  const rows = useMemo(() => (reps ? buildRows(reps, markets, stats, f) : []), [reps, markets, stats, f]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => !s || [r.name, r.marketName, r.email, r.phone].some((x) => (x ?? '').toLowerCase().includes(s)))
      .sort((a, b) => {
        const av = a[sort.k] ?? '', bv = b[sort.k] ?? '';
        return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
      });
  }, [rows, q, sort]);

  if (!reps) return <Loading />;
  const current = open && open !== 'new' ? rows.find((r) => r.id === open) ?? null : null;

  return (
    <>
      <PageHead
        tag="Reps"
        title="Every rep, every number."
        right={
          <div className="flex gap-2">
            <button className={btn} onClick={() => setImporting(true)}><Upload className="h-4 w-4" /> Import CSV</button>
            <button className={btnGold} onClick={() => setOpen('new')}><Plus className="h-4 w-4" /> Add rep</button>
          </div>
        }
      />
      <FilterBar value={f} onChange={setF} markets={markets} />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}
      <input placeholder="Search reps, markets, phone…" value={q} onChange={(e) => setQ(e.target.value)} className={`${input} mb-4 max-w-xs`} />

      <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
        {shown.length === 0 ? (
          <div className="p-4"><Empty>No reps match. Add one, or clear the filters.</Empty></div>
        ) : (
          <table className="w-full text-sm tabular">
            <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              <tr className="border-b border-line [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-semibold">
                {COLS.map((c) => (
                  <th key={c.k} className={c.num ? 'text-right' : ''} aria-sort={sort.k === c.k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                    <button className="cursor-pointer uppercase hover:text-gold" onClick={() => setSort((s) => ({ k: c.k, dir: s.k === c.k ? (s.dir === 1 ? -1 : 1) : c.num ? -1 : 1 }))}>
                      {c.l}{sort.k === c.k ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
                <th>30 days</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(r.id)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-raised [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-2.5">
                  <td>
                    <span className="inline-flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-deep font-mono text-[11px] text-gold">{initials(r.name.replace('Sample — ', ''))}</span>
                      <span className="font-semibold">{r.name}</span> {r.is_sample && <SampleTag />}
                    </span>
                  </td>
                  <td><IndTag industry={r.industry} /></td>
                  <td>{r.marketName}</td>
                  <td>{r.recruited_by ?? '—'}</td>
                  <td className="font-mono">{shortDate(r.start_date)}</td>
                  <td className="text-right font-mono">{r.today}</td>
                  <td className="text-right font-mono">{r.week}</td>
                  <td className="text-right font-mono text-gold-glow">{r.month}</td>
                  <td className="text-right font-mono">{r.season}</td>
                  <td className="text-right font-mono">{r.rangeInstalls}</td>
                  <td className="text-right font-mono">{r.connect == null ? '—' : `${r.connect}%`}</td>
                  <td><Sparkline values={r.spark} color={r.industry === 'pest' ? '#c08a52' : '#f5c518'} /></td>
                  <td><Pill tone={r.status === 'active' ? 'signed' : 'lost'}>{r.status === 'active' ? 'Active' : 'Inactive'}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2.5 text-xs text-ink-muted">Installs and connect are for the selected range. Put a rep&apos;s login email on their record to link their account.</p>

      {open && (
        <RepPanel
          rep={open === 'new' ? null : current}
          markets={markets}
          history={open === 'new' ? [] : stats.filter((s) => s.rep_id === open).sort((a, b) => (a.day < b.day ? -1 : 1))}
          onChanged={reload}
          onClose={() => setOpen(null)}
        />
      )}
      {importing && <ImportPanel reps={reps} onDone={reload} onClose={() => setImporting(false)} />}
    </>
  );
}

function RepPanel({ rep, markets, history, onChanged, onClose }: { rep: RepRow | null; markets: MarketRow[]; history: RepStat[]; onChanged: () => void; onClose: () => void }) {
  const actor = useActor();
  const [editing, setEditing] = useState(!rep);
  const [notes, setNotes] = useState<Note[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!rep || !supabase) return;
    supabase.from('rep_notes').select('id, rep_id, author_name, body, created_at').eq('rep_id', rep.id).order('created_at', { ascending: false })
      .then(({ data }) => setNotes((data as Note[]) ?? []));
  }, [rep?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const s = (k: string, max = 200) => { const v = String(fd.get(k) ?? '').trim().slice(0, max); return v || null; };
    const email = s('email', 160)?.toLowerCase() ?? null;
    let profile_id: string | null = null;
    if (email) {
      const { data } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      profile_id = (data as { id: string } | null)?.id ?? null;
    }
    const by = s('recruited_by');
    const row = {
      name: s('name', 120) ?? 'Unnamed', email, profile_id, phone: s('phone', 40),
      industry: fd.get('industry') === 'pest' ? 'pest' : 'fiber',
      market_id: s('market_id', 60), recruited_by: by === 'Braden' || by === 'Peter' ? by : null,
      start_date: s('start_date', 10), status: fd.get('status') === 'inactive' ? 'inactive' : 'active',
    };
    setBusy(true);
    const { error } = rep ? await supabase.from('reps').update(row).eq('id', rep.id) : await supabase.from('reps').insert(row);
    setBusy(false);
    if (error) return setErr(error.message);
    onChanged();
    if (rep) setEditing(false);
    else onClose();
  }

  async function remove() {
    if (!rep || !supabase || !confirm(`Delete ${rep.name} and all their numbers?`)) return;
    const { error } = await supabase.from('reps').delete().eq('id', rep.id);
    if (error) return setErr(error.message);
    onChanged();
    onClose();
  }

  async function log(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rep || !supabase) return;
    const fd = new FormData(e.currentTarget);
    const day = String(fd.get('day'));
    const n = (k: string) => Math.max(0, Math.round(Number(fd.get(k)) || 0));
    setBusy(true);
    const { error } = await supabase.from('rep_stats').upsert({ rep_id: rep.id, day, sales: n('sales'), installs: n('installs') }, { onConflict: 'rep_id,day' });
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg(`Saved ${shortDate(day)}.`);
    onChanged();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!rep || !note.trim() || !supabase) return;
    const { data, error } = await supabase
      .from('rep_notes')
      .insert({ rep_id: rep.id, body: note.trim().slice(0, 2000), author_id: actor.id, author_name: actor.name })
      .select('id, rep_id, author_name, body, created_at')
      .single();
    if (error) return setErr(error.message);
    setNotes((xs) => [data as Note, ...xs]);
    setNote('');
  }

  const color = rep?.industry === 'pest' ? '#c08a52' : '#f5c518';

  return (
    <Panel title={rep ? rep.name : 'Add rep'} actions={rep && !editing ? <button className={btn} onClick={() => setEditing(true)}>Edit</button> : undefined} onClose={onClose}>
      {err && <ErrorNote message={err} />}
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input name="name" defaultValue={rep?.name} required className={input} /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email" hint="Links the rep to their login"><input name="email" type="email" defaultValue={rep?.email ?? ''} className={input} /></Field>
            <Field label="Phone"><input name="phone" defaultValue={rep?.phone ?? ''} className={input} /></Field>
            <Field label="Industry"><select name="industry" defaultValue={rep?.industry ?? 'fiber'} className={input}><option value="fiber">Fiber</option><option value="pest">Pest control</option></select></Field>
            <Field label="Market">
              <select name="market_id" defaultValue={rep?.market_id ?? ''} className={input}>
                <option value="">—</option>
                {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Recruited by"><select name="recruited_by" defaultValue={rep?.recruited_by ?? ''} className={input}><option value="">—</option><option>Braden</option><option>Peter</option></select></Field>
            <Field label="Start date"><input name="start_date" type="date" defaultValue={rep?.start_date ?? ymd(new Date())} className={`${input} font-mono`} /></Field>
            <Field label="Status"><select name="status" defaultValue={rep?.status ?? 'active'} className={input}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
          </div>
          <div className="flex items-center gap-2">
            <button className={btnGold} disabled={busy}>{busy ? 'Saving…' : 'Save rep'}</button>
            {rep && <button type="button" className={btn} onClick={() => setEditing(false)}>Cancel</button>}
            {rep && <button type="button" className={btnDanger} onClick={remove}>Delete</button>}
          </div>
        </form>
      ) : rep && (
        <>
          <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-ink-muted">Industry</dt><dd><IndTag industry={rep.industry} /></dd>
            <dt className="text-ink-muted">Market</dt><dd>{rep.marketName}</dd>
            <dt className="text-ink-muted">Recruited by</dt><dd>{rep.recruited_by ?? '—'}</dd>
            <dt className="text-ink-muted">Started</dt><dd className="font-mono">{shortDate(rep.start_date)}</dd>
            <dt className="text-ink-muted">Phone</dt><dd className="font-mono">{rep.phone ? <a className="hover:text-gold" href={`tel:${rep.phone.replace(/[^\d+]/g, '')}`}>{rep.phone}</a> : '—'}</dd>
            <dt className="text-ink-muted">Email</dt><dd>{rep.email ?? '—'} {rep.profile_id && <span className="text-xs" style={{ color: TONE.signed }}>· linked to login</span>}</dd>
            <dt className="text-ink-muted">Status</dt><dd><Pill tone={rep.status === 'active' ? 'signed' : 'lost'}>{rep.status === 'active' ? 'Active' : 'Inactive'}</Pill></dd>
          </dl>
          <div className="grid grid-cols-4 gap-2">
            <Stat k="Today" v={rep.today} /><Stat k="Week" v={rep.week} /><Stat k="Month" v={rep.month} /><Stat k="Season" v={rep.season} />
          </div>
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">Performance history</h3>
            <DailyBars days={history.map((h) => ({ day: h.day, sales: h.sales }))} color={color} />
          </section>
          <form onSubmit={log} className="space-y-3 rounded-[10px] border border-line p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">Log numbers</h3>
            <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-end gap-2">
              <Field label="Day"><input name="day" type="date" defaultValue={ymd(new Date())} required className={`${input} font-mono`} /></Field>
              <Field label="Sales"><input name="sales" type="number" min={0} defaultValue={0} className={`${input} font-mono`} /></Field>
              <Field label="Installs"><input name="installs" type="number" min={0} defaultValue={0} className={`${input} font-mono`} /></Field>
              <button className={btnGold} disabled={busy}>Save</button>
            </div>
            {msg && <p className="text-sm" style={{ color: TONE.signed }}>{msg}</p>}
          </form>
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted">Notes</h3>
            <form onSubmit={addNote} className="mb-3 space-y-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note about this rep…" className={`${input} resize-y`} />
              <button className={btn} disabled={!note.trim()}>Add note as {actor.name}</button>
            </form>
            <Thread notes={notes} />
          </section>
        </>
      )}
    </Panel>
  );
}

/* CSV of daily numbers: header row `rep,date,sales,installs` — rep is the exact name or email. */
function ImportPanel({ reps, onDone, onClose }: { reps: { id: string; name: string; email: string | null }[]; onDone: () => void; onClose: () => void }) {
  const [csv, setCsv] = useState('rep,date,sales,installs\n');
  const [res, setRes] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!supabase) return;
    const lines = csv.trim().split(/\r?\n/);
    const head = (lines.shift() ?? '').toLowerCase().split(',').map((s) => s.trim());
    const at = (k: string) => head.indexOf(k);
    const skipped: string[] = [];
    const rows: RepStat[] = [];
    for (const line of lines.slice(0, 5000)) {
      const c = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
      const who = (c[at('rep')] ?? '').toLowerCase();
      const rep = reps.find((r) => r.name.toLowerCase() === who || (r.email ?? '').toLowerCase() === who);
      const day = c[at('date')] ?? '';
      if (!rep || !/^\d{4}-\d{2}-\d{2}$/.test(day)) { skipped.push(line); continue; }
      rows.push({ rep_id: rep.id, day, sales: Math.max(0, parseInt(c[at('sales')] ?? '0') || 0), installs: Math.max(0, parseInt(c[at('installs')] ?? '0') || 0) });
    }
    setBusy(true);
    const { error } = rows.length ? await supabase.from('rep_stats').upsert(rows, { onConflict: 'rep_id,day' }) : { error: null };
    setBusy(false);
    if (error) return setRes(error.message);
    setRes(`Imported ${rows.length} rows.${skipped.length ? ` Skipped ${skipped.length} (unknown rep or bad date): ${skipped.slice(0, 3).join(' | ')}` : ''}`);
    onDone();
  }

  return (
    <Panel title="Import daily numbers" onClose={onClose}>
      <p className="text-sm text-ink-muted">
        Paste or upload a CSV with a header row <span className="font-mono text-gold">rep,date,sales,installs</span>. <b className="text-ink">rep</b> is the rep&apos;s exact name or email; <b className="text-ink">date</b> is YYYY-MM-DD. Re-importing a day overwrites it.
      </p>
      <Field label="CSV file">
        <input type="file" accept=".csv,text/csv" className={input} onChange={async (e) => { const file = e.target.files?.[0]; if (file) setCsv(await file.text()); }} />
      </Field>
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={12} className={`${input} font-mono text-[13px]`} />
      <button className={btnGold} disabled={busy} onClick={run}>{busy ? 'Importing…' : 'Import'}</button>
      {res && <p className="rounded-md border border-line px-3 py-2 text-sm">{res}</p>}
    </Panel>
  );
}
