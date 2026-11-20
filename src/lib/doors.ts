/* Door tracker: shared between the rep's tap screen (src/tracker) and the Overview. */

export const OBJECTIONS = [
  { id: 'not_interested', label: 'Not interested' },
  { id: 'price', label: 'Price' },
  { id: 'has_provider', label: 'Already has one' },
  { id: 'decision_maker', label: 'Spouse / not the decider' },
  { id: 'renting', label: 'Renting' },
  { id: 'timing', label: 'Bad timing' },
  { id: 'other', label: 'Other' },
] as const;
export type ObjectionId = (typeof OBJECTIONS)[number]['id'];
export const objectionLabel = (id: string) => OBJECTIONS.find((o) => o.id === id)?.label ?? id.replace(/_/g, ' ');

export type DoorCount = {
  rep_id: string;
  day: string;
  doors: number;
  objections: number;
  sales: number;
  objection_mix: Record<string, number>;
};

export type DoorTotals = { doors: number; objections: number; sales: number; mix: Record<string, number> };

export function sumDoors(rows: DoorCount[]): DoorTotals {
  const t: DoorTotals = { doors: 0, objections: 0, sales: 0, mix: {} };
  for (const r of rows) {
    t.doors += r.doors;
    t.objections += r.objections;
    t.sales += r.sales;
    for (const [k, v] of Object.entries(r.objection_mix ?? {})) t.mix[k] = (t.mix[k] ?? 0) + Number(v || 0);
  }
  return t;
}

/** sales per 100 doors, as a whole percent */
export const closeRate = (t: { doors: number; sales: number }) => (t.doors ? Math.round((t.sales / t.doors) * 1000) / 10 : null);
