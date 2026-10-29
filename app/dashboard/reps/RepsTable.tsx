"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { RepRow } from "@/lib/dashboard";
import type { Note, RepStat } from "@/lib/types";
import { Sparkline, DailyBars } from "@/components/app/charts";
import { createClient } from "@/lib/supabase/client";
import { addRepNote, deleteRep, importStatsCsv, logStats, saveRep } from "../actions";
import { dateTime, shortDate, ymd } from "@/lib/dates";

type Key = "name" | "industry" | "marketName" | "recruited_by" | "start_date" | "today" | "week" | "month" | "season" | "rangeInstalls" | "connect" | "status";
const COLS: { k: Key; l: string; num?: boolean }[] = [
  { k: "name", l: "Rep" }, { k: "industry", l: "Industry" }, { k: "marketName", l: "Market" }, { k: "recruited_by", l: "Recruited by" },
  { k: "start_date", l: "Start" }, { k: "today", l: "Today", num: true }, { k: "week", l: "Week", num: true }, { k: "month", l: "Month", num: true },
  { k: "season", l: "Season", num: true }, { k: "rangeInstalls", l: "Installs", num: true }, { k: "connect", l: "Connect", num: true },
];

export function RepsTable({ rows, markets, history, range }: { rows: RepRow[]; markets: { id: string; name: string }[]; history: RepStat[]; range: string }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "month", dir: -1 });
  const [open, setOpen] = useState<RepRow | "new" | null>(null);
  const [importing, setImporting] = useState(false);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => !s || [r.name, r.marketName, r.email, r.phone].some((x) => (x ?? "").toLowerCase().includes(s)))
      .sort((a, b) => {
        const av = a[sort.k] ?? "", bv = b[sort.k] ?? "";
        return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
      });
  }, [rows, q, sort]);

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input placeholder="Search reps, markets, phone…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setImporting(true)}>Import CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setOpen("new")}>Add rep</button>
        </div>
      </div>
      <div className="card tbl-wrap">
        {shown.length === 0 ? <div className="empty" style={{ margin: 16 }}>No reps match. Add one, or clear the filters.</div> : (
          <table className="tbl cards">
            <thead><tr>
              {COLS.map((c) => (
                <th key={c.k} className={c.num ? "num" : ""} aria-sort={sort.k === c.k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  <button onClick={() => setSort((s) => ({ k: c.k, dir: s.k === c.k ? (s.dir === 1 ? -1 : 1) : c.num ? -1 : 1 }))}>
                    {c.l}{sort.k === c.k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
              <th>30 days</th><th>Pillars</th><th>Status</th>
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="click" onClick={() => setOpen(r)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(r)}>
                  <td data-l="Rep" className="lead"><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="avatar">{r.name.replace("Sample — ", "").split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                    <span>{r.name} {r.is_sample && <span className="sample">sample</span>}</span></span></td>
                  <td data-l="Industry"><span className={`ind ind-${r.industry}`}>{r.industry === "pest" ? "Pest" : "Fiber"}</span></td>
                  <td data-l="Market">{r.marketName}</td>
                  <td data-l="Recruited by">{r.recruited_by ?? "—"}</td>
                  <td data-l="Start" className="mono">{shortDate(r.start_date)}</td>
                  <td data-l="Today" className="num">{r.today}</td>
                  <td data-l="Week" className="num">{r.week}</td>
                  <td data-l="Month" className="num glow">{r.month}</td>
                  <td data-l="Season" className="num">{r.season}</td>
                  <td data-l="Installs" className="num">{r.rangeInstalls}</td>
                  <td data-l="Connect" className="num">{r.connect == null ? "—" : `${r.connect}%`}</td>
                  <td data-l="30 days"><Sparkline values={r.spark} color={r.industry === "pest" ? "var(--pest)" : "var(--gold)"} /></td>
                  <td data-l="Pillars" className="mono" style={{ fontSize: 12 }}>{r.pillar ? `${r.pillar.physical ?? "–"}·${r.pillar.spiritual ?? "–"}·${r.pillar.mental ?? "–"}·${r.pillar.financial ?? "–"}` : <span className="muted">—</span>}</td>
                  <td data-l="Status"><span className={`pill ${r.status === "active" ? "st-signed" : "st-lost"}`}>{r.status === "active" ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Installs and connect are for the selected range ({range}). Pillars = physical · spiritual · mental · financial from the rep&apos;s latest check-in (needs the rep linked to their login by email).</p>

      {open && <RepPanel rep={open === "new" ? null : open} markets={markets} history={open === "new" ? [] : history.filter((h) => h.rep_id === open.id)} onClose={() => setOpen(null)} />}
      {importing && <ImportPanel onClose={() => setImporting(false)} />}
    </>
  );
}

function RepPanel({ rep, markets, history, onClose }: { rep: RepRow | null; markets: { id: string; name: string }[]; history: RepStat[]; onClose: () => void }) {
  const [editing, setEditing] = useState(!rep);
  const [notes, setNotes] = useState<Note[]>([]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!rep) return;
    createClient().from("rep_notes").select("id, author_name, body, created_at").eq("rep_id", rep.id).order("created_at", { ascending: false })
      .then(({ data }) => setNotes((data as Note[]) ?? []));
  }, [rep]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={rep ? rep.name : "Add rep"}>
        <div className="panel-head">
          <h2>{rep ? rep.name : "Add rep"}</h2>
          {rep && !editing && <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>}
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="panel-body">
          {editing ? (
            <form className="stack" style={{ gap: 12 }} action={(fd) => start(async () => { await saveRep(fd); onClose(); })}>
              {rep && <input type="hidden" name="id" value={rep.id} />}
              <label className="field"><span>Name</span><input name="name" defaultValue={rep?.name} required /></label>
              <div className="grid-auto">
                <label className="field"><span>Email</span><input name="email" type="email" defaultValue={rep?.email ?? ""} /><small>Links the rep to their login</small></label>
                <label className="field"><span>Phone</span><input name="phone" defaultValue={rep?.phone ?? ""} /></label>
                <label className="field"><span>Industry</span><select name="industry" defaultValue={rep?.industry ?? "fiber"}><option value="fiber">Fiber</option><option value="pest">Pest control</option></select></label>
                <label className="field"><span>Market</span><select name="market_id" defaultValue={rep?.market_id ?? ""}><option value="">—</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
                <label className="field"><span>Recruited by</span><select name="recruited_by" defaultValue={rep?.recruited_by ?? ""}><option value="">—</option><option>Braden</option><option>Peter</option></select></label>
                <label className="field"><span>Start date</span><input name="start_date" type="date" defaultValue={rep?.start_date ?? ymd(new Date())} /></label>
                <label className="field"><span>Status</span><select name="status" defaultValue={rep?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save rep"}</button>
                {rep && <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>}
                {rep && <button type="button" className="btn btn-ghost down" style={{ marginLeft: "auto" }}
                  onClick={() => confirm(`Delete ${rep.name} and all their numbers?`) && start(async () => { await deleteRep(rep.id); onClose(); })}>Delete</button>}
              </div>
            </form>
          ) : rep && (
            <>
              <dl className="kv">
                <dt>Industry</dt><dd><span className={`ind ind-${rep.industry}`}>{rep.industry === "pest" ? "Pest control" : "Fiber"}</span></dd>
                <dt>Market</dt><dd>{rep.marketName}</dd>
                <dt>Recruited by</dt><dd>{rep.recruited_by ?? "—"}</dd>
                <dt>Started</dt><dd className="mono">{shortDate(rep.start_date)}</dd>
                <dt>Phone</dt><dd className="mono">{rep.phone ?? "—"}</dd>
                <dt>Email</dt><dd>{rep.email ?? "—"} {rep.profile_id ? <span className="up" style={{ fontSize: 12 }}>· linked to login</span> : null}</dd>
                <dt>Status</dt><dd><span className={`pill ${rep.status === "active" ? "st-signed" : "st-lost"}`}>{rep.status === "active" ? "Active" : "Inactive"}</span></dd>
              </dl>
              <div className="grid-auto" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                {([["Today", rep.today], ["Week", rep.week], ["Month", rep.month], ["Season", rep.season]] as const).map(([k, v]) => (
                  <div className="stat" key={k}><span className="k">{k}</span><span className="v" style={{ fontSize: 22 }}>{v}</span></div>
                ))}
              </div>
              <div><div className="label" style={{ marginBottom: 8 }}>Performance history</div>
                <DailyBars days={history.map((h) => ({ day: h.day, sales: h.sales }))} color={rep.industry === "pest" ? "var(--pest)" : "var(--gold)"} /></div>
              {rep.pillar && <div><div className="label" style={{ marginBottom: 8 }}>Latest pillar check-in</div>
                <div className="minichips">{Object.entries(rep.pillar).map(([k, v]) => <span className="minichip" key={k}>{k} <b>{v ?? "—"}</b></span>)}</div></div>}

              <form className="card" style={{ padding: 14, display: "grid", gap: 10 }} action={(fd) => start(async () => {
                await logStats(rep.id, String(fd.get("day")), Number(fd.get("sales")), Number(fd.get("installs")));
                setMsg("Saved. Numbers update when you close this panel.");
              })}>
                <div className="label">Log numbers</div>
                <div className="grid-auto" style={{ gridTemplateColumns: "1.4fr 1fr 1fr auto", alignItems: "end" }}>
                  <label className="field"><span>Day</span><input name="day" type="date" defaultValue={ymd(new Date())} required /></label>
                  <label className="field"><span>Sales</span><input name="sales" type="number" min={0} defaultValue={0} /></label>
                  <label className="field"><span>Installs</span><input name="installs" type="number" min={0} defaultValue={0} /></label>
                  <button className="btn btn-primary" disabled={pending}>Save</button>
                </div>
                {msg && <span className="up" style={{ fontSize: 13 }}>{msg}</span>}
              </form>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>Notes</div>
                <form className="stack" style={{ gap: 8, marginBottom: 12 }} onSubmit={(e) => {
                  e.preventDefault(); if (!note.trim()) return;
                  start(async () => { const n = await addRepNote(rep.id, note); setNotes((x) => [n, ...x]); setNote(""); });
                }}>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note about this rep…" />
                  <button className="btn btn-sm" disabled={pending || !note.trim()} style={{ justifySelf: "start" }}>Add note</button>
                </form>
                <div className="thread">
                  {notes.length === 0 ? <p className="muted" style={{ fontSize: 14 }}>No notes yet.</p> : notes.map((n) => (
                    <div className="n" key={n.id}><div className="h"><b>{n.author_name ?? "—"}</b><span className="mono">{dateTime(n.created_at)}</span></div><div>{n.body}</div></div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const [csv, setCsv] = useState("rep,date,sales,installs\n");
  const [res, setRes] = useState<string>("");
  const [pending, start] = useTransition();
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label="Import CSV">
        <div className="panel-head"><h2>Import daily numbers</h2><button className="btn btn-sm" onClick={onClose}>✕</button></div>
        <div className="panel-body">
          <p className="muted" style={{ fontSize: 14 }}>Paste a CSV with a header row: <code className="mono gold">rep,date,sales,installs</code>. <b>rep</b> is the rep&apos;s exact name or email; <b>date</b> is YYYY-MM-DD. Re-importing a rep&apos;s day overwrites it.</p>
          <label className="field"><span>CSV file</span><input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} /></label>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={12} className="mono" style={{ fontFamily: "var(--mono)", fontSize: 13 }} />
          <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => {
            try { const r = await importStatsCsv(csv); setRes(`Imported ${r.imported} rows.${r.skipped.length ? ` Skipped ${r.skipped.length} (unknown rep or bad date): ${r.skipped.slice(0, 3).join(" | ")}` : ""}`); }
            catch (e) { setRes(e instanceof Error ? e.message : "Import failed"); }
          })}>{pending ? "Importing…" : "Import"}</button>
          {res && <div className="form-msg">{res}</div>}
        </div>
      </aside>
    </>
  );
}
