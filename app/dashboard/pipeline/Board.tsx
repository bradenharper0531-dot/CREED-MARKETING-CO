"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAGES, stageStatus, type Note, type Recruit, type Stage } from "@/lib/types";
import { addRecruitNote, convertToRep, deleteRecruit, moveRecruit, saveRecruit } from "../actions";
import { dateTime, shortDate, ymd } from "@/lib/dates";

export type NoteRow = Note & { recruit_id: string };
const PILLAR = { physical: "Physical", spiritual: "Spiritual", mental: "Mental", financial: "Financial" } as const;
const isOverdue = (r: Recruit) => !!r.next_follow_up && r.next_follow_up < ymd(new Date()) && !["signed", "cold", "not_fit"].includes(r.stage);

export function Board({ recruits, notes, markets }: { recruits: Recruit[]; notes: NoteRow[]; markets: string[] }) {
  const router = useRouter();
  const [items, setItems] = useState(recruits);
  const [allNotes, setAllNotes] = useState(notes);
  useEffect(() => setItems(recruits), [recruits]);
  useEffect(() => setAllNotes(notes), [notes]);
  const [view, setView] = useState<"board" | "table">("board");
  const [owner, setOwner] = useState<"all" | "Braden" | "Peter">("all");
  const [showSide, setShowSide] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [open, setOpen] = useState<string | "new" | null>(null);
  const [, start] = useTransition();

  const shown = items.filter((r) => owner === "all" || r.owner_name === owner);
  const latest = useMemo(() => {
    const m = new Map<string, NoteRow>();
    for (const n of allNotes) if (!m.has(n.recruit_id)) m.set(n.recruit_id, n);
    return m;
  }, [allNotes]);

  function move(id: string, stage: Stage) {
    const r = items.find((x) => x.id === id);
    if (!r || r.stage === stage) return;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, stage, last_touch: new Date().toISOString() } : x)));
    start(async () => {
      await moveRecruit(id, stage);
      if (stage === "signed") setOpen(id);
      router.refresh();
    });
  }

  const cols = STAGES.filter((s) => !s.side || showSide);
  const overdueCount = shown.filter(isOverdue).length;

  return (
    <>
      <div className="filters">
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={view === "board"} onClick={() => setView("board")}>Board</button>
          <button aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
        </div>
        <span className="sep" />
        {(["all", "Braden", "Peter"] as const).map((o) => <button key={o} className="chip" aria-pressed={owner === o} onClick={() => setOwner(o)}>{o === "all" ? "Everyone's" : `${o}'s`}</button>)}
        <span className="sep" />
        <button className="chip" aria-pressed={showSide} onClick={() => setShowSide((s) => !s)}>
          {showSide ? "Hide" : "Show"} went cold / not a fit ({shown.filter((r) => r.stage === "cold" || r.stage === "not_fit").length})
        </button>
        {overdueCount > 0 && <span className="overdue" style={{ fontSize: 13 }}>{overdueCount} follow-up{overdueCount > 1 ? "s" : ""} overdue</span>}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen("new")}>Add recruit</button>
      </div>

      {view === "board" ? (
        <div className="board">
          {cols.map((c) => {
            const list = shown.filter((r) => r.stage === c.id);
            return (
              <section key={c.id} className={`col ${over === c.id ? "drop" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setOver(c.id); }}
                onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
                onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, c.id); }}>
                <div className="col-head"><span className={`pill st-${stageStatus[c.id]}`}>{c.label}</span><span className="mono muted">{list.length}</span></div>
                <div className="col-body">
                  {list.length === 0 && <p className="muted" style={{ fontSize: 13, padding: 8 }}>Drop a card here.</p>}
                  {list.map((r) => {
                    const n = latest.get(r.id);
                    return (
                      <div key={r.id} draggable role="button" tabIndex={0} className={`kcard ${drag === r.id ? "dragging" : ""}`}
                        onDragStart={(e) => { e.dataTransfer.setData("text/plain", r.id); setDrag(r.id); }}
                        onDragEnd={() => setDrag(null)} onClick={() => setOpen(r.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) setOpen(r.id); }}>
                        <div className="nm">{r.name} {r.is_sample && <span className="sample">sample</span>}</div>
                        <div className="meta">
                          {r.industry_interest && <span className={`ind ind-${r.industry_interest === "either" ? "starlink" : r.industry_interest}`}>{r.industry_interest}</span>}
                          {r.preferred_market && <span>{r.preferred_market}</span>}
                          {r.pillar && <span>· {PILLAR[r.pillar]}</span>}
                        </div>
                        <div className="meta">
                          <span className="mono">{r.owner_name ?? "Unassigned"}</span>
                          <span className="mono">· touched {shortDate(r.last_touch)}</span>
                          {r.next_follow_up && <span className={`mono ${isOverdue(r) ? "overdue" : ""}`}>· follow up {shortDate(r.next_follow_up)}{isOverdue(r) ? " (overdue)" : ""}</span>}
                        </div>
                        {n && <div className="note">{n.body}</div>}
                        {/* keyboard alternative to drag-and-drop */}
                        <select aria-label={`Move ${r.name} to stage`} value={r.stage} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => move(r.id, e.target.value as Stage)} style={{ padding: "5px 8px", fontSize: 12 }}>
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
        <div className="card tbl-wrap">
          <table className="tbl cards">
            <thead><tr><th>Name</th><th>Stage</th><th>Phone</th><th>Interest</th><th>Market</th><th>Pillar</th><th>Owner</th><th>Last touch</th><th>Follow up</th><th>Latest note</th></tr></thead>
            <tbody>{shown.filter((r) => showSide || !["cold", "not_fit"].includes(r.stage)).map((r) => (
              <tr key={r.id} className="click" onClick={() => setOpen(r.id)}>
                <td data-l="Name" className="lead">{r.name} {r.is_sample && <span className="sample">sample</span>}</td>
                <td data-l="Stage"><span className={`pill st-${stageStatus[r.stage]}`}>{STAGES.find((s) => s.id === r.stage)?.label}</span></td>
                <td data-l="Phone" className="mono">{r.phone ?? "—"}</td>
                <td data-l="Interest">{r.industry_interest ?? "—"}</td>
                <td data-l="Market">{r.preferred_market ?? "—"}</td>
                <td data-l="Pillar">{r.pillar ? PILLAR[r.pillar] : "—"}</td>
                <td data-l="Owner">{r.owner_name ?? "—"}</td>
                <td data-l="Last touch" className="mono">{shortDate(r.last_touch)}</td>
                <td data-l="Follow up" className={`mono ${isOverdue(r) ? "overdue" : ""}`}>{shortDate(r.next_follow_up)}{isOverdue(r) ? " ⚠" : ""}</td>
                <td data-l="Latest note" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>{latest.get(r.id)?.body ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {open && (
        <RecruitPanel
          recruit={open === "new" ? null : items.find((r) => r.id === open) ?? null}
          notes={open === "new" ? [] : allNotes.filter((n) => n.recruit_id === open)}
          markets={markets}
          onNote={(n) => setAllNotes((xs) => [n, ...xs])}
          onMove={move}
          onClose={() => { setOpen(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function RecruitPanel({ recruit: r, notes, markets, onNote, onMove, onClose }: {
  recruit: Recruit | null; notes: NoteRow[]; markets: string[];
  onNote: (n: NoteRow) => void; onMove: (id: string, s: Stage) => void; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [converted, setConverted] = useState(false);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={r ? r.name : "Add recruit"}>
        <div className="panel-head">
          <h2>{r ? r.name : "Add recruit"}</h2>
          {r && <span className={`pill st-${stageStatus[r.stage]}`}>{STAGES.find((s) => s.id === r.stage)?.label}</span>}
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="panel-body">
          {r?.stage === "signed" && !converted && (
            <div className="well" style={{ borderColor: "var(--status-signed)" }}>
              <div style={{ fontWeight: 600 }} className="up">Signed. Create a rep record for {r.name.split(" ")[0]}?</div>
              <p className="muted" style={{ fontSize: 13 }}>Copies name, phone, email, market and who recruited them into Reps.</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["fiber", "pest"] as const).map((ind) => (
                  <button key={ind} className="btn btn-sm" disabled={pending} onClick={() => start(async () => { await convertToRep(r.id, ind); setConverted(true); })}>
                    Create {ind === "fiber" ? "fiber" : "pest control"} rep
                  </button>
                ))}
              </div>
            </div>
          )}
          {converted && <div className="form-msg ok">Rep created. Find them under Reps.</div>}

          {r && (
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Where they&apos;re at</div>
              <form className="stack" style={{ gap: 8 }} onSubmit={(e) => {
                e.preventDefault(); if (!text.trim()) return;
                start(async () => { const n = await addRecruitNote(r.id, text); onNote({ ...n, recruit_id: r.id }); setText(""); });
              }}>
                <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Called him — wants to start after finals, talking to parents this week." />
                <button className="btn btn-primary btn-sm" disabled={pending || !text.trim()} style={{ justifySelf: "start" }}>Add update</button>
              </form>
              <div className="thread" style={{ marginTop: 12 }}>
                {notes.length === 0 ? <p className="muted" style={{ fontSize: 14 }}>No updates yet.</p> : notes.map((n) => (
                  <div className="n" key={n.id}><div className="h"><b>{n.author_name ?? "—"}</b><span className="mono">{dateTime(n.created_at)}</span></div><div>{n.body}</div></div>
                ))}
              </div>
            </div>
          )}

          <form className="stack" style={{ gap: 12 }} action={(fd) => start(async () => { await saveRecruit(fd); setMsg("Saved."); if (!r) onClose(); })}>
            <div className="label">Details</div>
            {r && <input type="hidden" name="id" value={r.id} />}
            <label className="field"><span>Name</span><input name="name" defaultValue={r?.name} required /></label>
            <div className="grid-auto">
              <label className="field"><span>Phone</span><input name="phone" defaultValue={r?.phone ?? ""} /></label>
              <label className="field"><span>Email</span><input name="email" type="email" defaultValue={r?.email ?? ""} /></label>
              <label className="field"><span>Instagram</span><input name="instagram" defaultValue={r?.instagram ?? ""} /></label>
              <label className="field"><span>Interest</span><select name="industry_interest" defaultValue={r?.industry_interest ?? "either"}><option value="fiber">Fiber</option><option value="pest">Pest control</option><option value="either">Either</option></select></label>
              <label className="field"><span>Target market</span><select name="preferred_market" defaultValue={r?.preferred_market ?? ""}><option value="">—</option>{markets.map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className="field"><span>Pillar</span><select name="pillar" defaultValue={r?.pillar ?? ""}><option value="">—</option>{Object.entries(PILLAR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="field"><span>Owner</span><select name="owner_name" defaultValue={r?.owner_name ?? ""}><option value="">Unassigned</option><option>Braden</option><option>Peter</option></select></label>
              <label className="field"><span>Next follow-up</span><input name="next_follow_up" type="date" defaultValue={r?.next_follow_up ?? ""} /></label>
              <label className="field"><span>Source</span><input name="source" defaultValue={r?.source ?? ""} /></label>
            </div>
            {r && (
              <label className="field"><span>Stage</span>
                <select value={r.stage} onChange={(e) => onMove(r.id, e.target.value as Stage)}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              </label>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : r ? "Save details" : "Add recruit"}</button>
              {msg && <span className="up" style={{ fontSize: 13 }}>{msg}</span>}
              {r && <button type="button" className="btn btn-ghost down" style={{ marginLeft: "auto" }}
                onClick={() => confirm(`Delete ${r.name} from the pipeline?`) && start(async () => { await deleteRecruit(r.id); onClose(); })}>Delete</button>}
            </div>
          </form>
          {r && <p className="muted mono" style={{ fontSize: 12 }}>Added {dateTime(r.created_at)}{r.source ? ` · via ${r.source}` : ""}</p>}
        </div>
      </aside>
    </>
  );
}
