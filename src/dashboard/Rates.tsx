import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { PageHead } from './Dashboard.tsx';
import { CALC_MARKETS } from '../data/markets.ts';
import { money } from '../lib/payPlan.ts';
import { btnGold, Card, ErrorNote, Field, input, Loading, TONE } from './ui.tsx';

type RateRow = {
  id: string;
  name: string;
  market_rates: { base: number | null; cap: number | null; step: number | null; bump: number | null; basis: string | null; owner_notes: string[] | null } | null;
};

/* Full contract pay per market — owner-only (row-level security on market_rates).
   These feed the calculator's Owner view and the spread tables. */
export function Rates() {
  const [rows, setRows] = useState<RateRow[] | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('markets').select('id, name, market_rates(base, cap, step, bump, basis, owner_notes)').order('sort');
    if (error) setError(error.message);
    setRows(
      ((data as unknown as (Omit<RateRow, 'market_rates'> & { market_rates: RateRow['market_rates'] | RateRow['market_rates'][] })[]) ?? []).map((m) => ({
        ...m,
        market_rates: Array.isArray(m.market_rates) ? m.market_rates[0] ?? null : m.market_rates,
      })),
    );
  };
  useEffect(() => {
    load();
  }, []);

  if (!rows) return <Loading />;

  return (
    <>
      <PageHead
        tag="Contract rates"
        title="What Creed is paid."
        sub="Full contract pay per market. Only owners can see these — they power the Owner view in the calculator. Rep pay comes from the public market presets."
      />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((m) => <RateCard key={m.id} m={m} onSaved={load} />)}
      </div>
    </>
  );
}

function RateCard({ m, onSaved }: { m: RateRow; onSaved: () => void }) {
  const r = m.market_rates;
  const rep = CALC_MARKETS.find((c) => c.name === m.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const n = (k: string) => { const v = String(fd.get(k) ?? '').trim(); return v === '' ? null : Number(v); };
    setBusy(true);
    setErr('');
    const { error } = await supabase.from('market_rates').upsert({
      market_id: m.id,
      base: n('base'),
      cap: n('cap'),
      step: n('step') ?? 25,
      bump: n('bump') ?? 25,
      basis: fd.get('basis') === 'installed' ? 'installed' : 'sold',
      owner_notes: String(fd.get('owner_notes') ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg('Saved.');
    onSaved();
  }

  return (
    <Card title={m.name} right={rep ? <span className="font-mono text-xs text-ink-muted">Rep pay {rep.base >= rep.cap ? money(rep.cap) : `${money(rep.base)} → ${money(rep.cap)}`}</span> : undefined}>
      <form onSubmit={save} className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="Base"><input name="base" type="number" defaultValue={r?.base ?? ''} className={`${input} font-mono`} /></Field>
          <Field label="Cap"><input name="cap" type="number" defaultValue={r?.cap ?? ''} className={`${input} font-mono`} /></Field>
          <Field label="Raise every"><input name="step" type="number" defaultValue={r?.step ?? 25} className={`${input} font-mono`} /></Field>
          <Field label="Raise $"><input name="bump" type="number" defaultValue={r?.bump ?? 25} className={`${input} font-mono`} /></Field>
          <Field label="Counts">
            <select name="basis" defaultValue={r?.basis ?? 'sold'} className={input}>
              <option value="sold">Sales</option>
              <option value="installed">Installs</option>
            </select>
          </Field>
        </div>
        <Field label="Owner notes" hint="One per line">
          <textarea name="owner_notes" rows={2} defaultValue={(r?.owner_notes ?? []).join('\n')} className={`${input} resize-y`} />
        </Field>
        {err && <ErrorNote message={err} />}
        <div className="flex items-center gap-3">
          <button className={btnGold} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          {msg && <span className="text-sm" style={{ color: TONE.signed }}>{msg}</span>}
          {r?.base != null && rep && (
            <span className="ml-auto font-mono text-xs text-ink-muted">Spread at start <b className="text-gold-glow">{money((r.base ?? 0) - rep.base)}</b></span>
          )}
        </div>
      </form>
    </Card>
  );
}
