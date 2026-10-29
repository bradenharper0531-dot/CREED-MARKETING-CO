/**
 * The Creed pay engine — ported 1:1 from the Creed Co Fiber Growth Plan and
 * Creed Co Owner Plan calculators.
 *
 * Rate = base + bump for every `step` accounts in the month, capped. A raise
 * applies to EVERY account that month and resets on the 1st. Pay counts only
 * connected accounts (sold × connect rate).
 */
import type { PayRules } from "./types";

export type Rules = ReturnType<typeof rules>;

const N = (x: number | null | undefined) => (x == null ? NaN : x);

export function rules(r: PayRules, ir: number, extra = 0) {
  const base = N(r.base) + extra;
  const cap = N(r.cap);
  const step = Math.max(1, r.step || 1);
  const bump = r.bump || 0;
  const counted = (s: number) => Math.floor(r.basis === "installed" ? s * ir : s);
  const rateAt = (s: number) => Math.min(cap, base + bump * Math.floor(counted(s) / step));
  return { base, cap, step, bump, basis: r.basis, counted, rateAt, payAt: (s: number) => s * ir * rateAt(s) };
}

/** Projects pay over n work days, splitting into calendar months so tiers reset. */
export function projector(R: Rules, prior: number, daysLeft: number, workDaysPerMonth: number) {
  return (pace: number, n: number) => {
    let rem = Math.max(0, n);
    const c1 = Math.min(rem, daysLeft);
    const months = [prior + pace * c1];
    rem -= c1;
    if (workDaysPerMonth > 0) {
      while (rem > 1e-9) {
        const c = Math.min(rem, workDaysPerMonth);
        months.push(pace * c);
        rem -= c;
      }
    }
    return {
      pay: months.reduce((a, m) => a + R.payAt(m), 0),
      sold: prior + pace * Math.max(0, n),
      rate: R.rateAt(months[months.length - 1]),
    };
  };
}

export const money = (n: number) => (isFinite(n) ? "$" + Math.round(n).toLocaleString("en-US") : "—");
export const num = (n: number, d = 1) =>
  isFinite(n) ? (+n).toLocaleString("en-US", { maximumFractionDigits: d }) : "—";
export const rateLabel = (R: Rules) =>
  !isFinite(R.base) ? "Coming soon" : R.base >= R.cap ? money(R.cap) : `${money(R.base)} → ${money(R.cap)}`;

export function autoDaysLeft(daysPerWeek: number) {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.round((end - d.getDate() + 1) * (Math.min(7, daysPerWeek || 0) / 7));
}
