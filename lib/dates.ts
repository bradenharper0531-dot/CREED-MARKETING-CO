/** Date helpers. All dates are plain YYYY-MM-DD strings (local calendar days). */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Monday of the week containing d. */
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export type Range = "today" | "week" | "month" | "season";
export const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "season", label: "Season" },
];

/** [start, end] for a range, plus the equal-length previous period for ▲▼ deltas. Season = last 14 weeks. */
export function rangeBounds(r: Range, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date;
  if (r === "today") start = end;
  else if (r === "week") start = weekStart(end);
  else if (r === "month") start = new Date(end.getFullYear(), end.getMonth(), 1);
  else start = addDays(end, -97);
  const len = Math.round((end.getTime() - start.getTime()) / 864e5) + 1;
  return { start: ymd(start), end: ymd(end), prevStart: ymd(addDays(start, -len)), prevEnd: ymd(addDays(start, -1)) };
}

export const shortDate = (s: string | null) =>
  s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
export const dateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
