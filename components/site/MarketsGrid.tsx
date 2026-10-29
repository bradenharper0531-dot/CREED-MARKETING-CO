"use client";
import { useState } from "react";
import type { Market } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "fiber", label: "Fiber" },
  { id: "pest", label: "Pest" },
  { id: "starlink", label: "Starlink" },
] as const;

export function MarketsGrid({ markets }: { markets: Market[] }) {
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("all");
  const shown = markets.filter((m) => f === "all" || m.industry === f);
  return (
    <>
      <div className="filters" role="group" aria-label="Filter markets">
        {FILTERS.map((x) => (
          <button key={x.id} className="chip" aria-pressed={f === x.id} onClick={() => setF(x.id)}>{x.label}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="empty">{f === "all" ? "No markets listed yet." : `No ${f === "pest" ? "pest control" : f} markets listed yet.`}</div>
      ) : (
        <div className="markets">
          {shown.map((m) => (
            <article className="mcard" key={m.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span className={`ind ind-${m.industry}`}>{m.industry === "pest" ? "Pest control" : m.industry}</span>
                {m.provider && <span className="muted" style={{ fontSize: 13 }}>{m.provider}</span>}
              </div>
              <h3>{m.name}</h3>
              <dl>
                <dt>Leads</dt><dd>{m.leads || "—"}</dd>
                <dt>Connect rate</dt><dd>{m.connect_label || "—"}</dd>
                <dt>Pay</dt><dd>{m.public_rate_label || "—"}</dd>
              </dl>
              {m.pace_tiers && m.pace_tiers.length === 3 && (
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Deals per day</div>
                  <div className="ladder">
                    {m.pace_tiers.map((t) => {
                      const [name, range] = t.l.split(" ");
                      return <div key={t.l}><b>{range}</b><span>{name === "Avg" ? "Average" : name}</span></div>;
                    })}
                  </div>
                </div>
              )}
              {m.notes && m.notes.length > 0 && <p className="muted" style={{ fontSize: 14 }}>{m.notes.join(" · ")}</p>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
